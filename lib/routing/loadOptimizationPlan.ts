import { optimizeRoutes } from "./optimize";
import type { RoutingRequest, RoutingVehicle } from "./types";
import { createSupabaseServerClient } from "../supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type OptimizeInput = { requestIds?: unknown; vehicleIds?: unknown; routeDate?: unknown };
const ids = (v: unknown) => Array.isArray(v) && v.length && v.every((x) => typeof x === "string" && UUID.test(x)) ? [...new Set(v)].sort() : null;
export async function loadOptimizationPlan(input: OptimizeInput) {
  const requestIds=ids(input.requestIds),vehicleIds=ids(input.vehicleIds);
  if(!requestIds||!vehicleIds)return {error:"Select at least one valid delivery request and one valid vehicle.",status:400 as const};
  if(typeof input.routeDate!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(input.routeDate))return {error:"A valid route date is required.",status:400 as const};
  const supabase=await createSupabaseServerClient(),{data:{user}}=await supabase.auth.getUser();
  if(!user)return {auth:"unauthorized" as const};
  const {data:profile,error:profileError}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if(profileError)return {error:profileError.message,status:500 as const}; if(profile?.role!=="admin")return {auth:"forbidden" as const};
  const [d,v]=await Promise.all([supabase.from("delivery_requests").select("id,status,load_quantity,pickup_address,dropoff_address,pickup_latitude,pickup_longitude,dropoff_latitude,dropoff_longitude,order_id,bulk_order_id").in("id",requestIds),supabase.from("vehicles").select("id,name,vehicle_number,capacity_kg,status,current_latitude,current_longitude").in("id",vehicleIds)]);
  if(d.error||v.error)return {error:d.error?.message??v.error?.message??"Unable to load optimization data.",status:500 as const}; const dr=d.data??[],vr=v.data??[];
  if(dr.length!==requestIds.length||vr.length!==vehicleIds.length)return {error:"One or more selected delivery requests or vehicles were not found or are not accessible.",status:400 as const};
  const bad=dr.filter(x=>!["requested","scheduled"].includes(x.status));if(bad.length)return {error:`Only requested or scheduled delivery requests can be optimized. Ineligible: ${bad.map(x=>x.id).join(", ")}`,status:400 as const};const unavailable=vr.filter(x=>x.status!=="available");if(unavailable.length)return {error:`Only available vehicles can be optimized. Unavailable: ${unavailable.map(x=>x.id).join(", ")}`,status:400 as const};
  const requests:RoutingRequest[]=dr.map(x=>({id:x.id,load:Number(x.load_quantity),pickup:{latitude:Number(x.pickup_latitude),longitude:Number(x.pickup_longitude)},delivery:{latitude:Number(x.dropoff_latitude),longitude:Number(x.dropoff_longitude)},pickupLabel:x.pickup_address,deliveryLabel:x.dropoff_address,reference:x.order_id??x.bulk_order_id??undefined})); const vehicles:RoutingVehicle[]=vr.map(x=>({id:x.id,label:`${x.name} · ${x.vehicle_number}`,capacity:Number(x.capacity_kg),available:true,start:x.current_latitude===null||x.current_longitude===null?undefined:{latitude:Number(x.current_latitude),longitude:Number(x.current_longitude)}}));
  try{return {supabase,user,requestIds,vehicleIds,routeDate:input.routeDate,plan:optimizeRoutes(requests,vehicles)}}catch(error){return {error:error instanceof Error?error.message:"Optimization failed.",status:400 as const}}
}
