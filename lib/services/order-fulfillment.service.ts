import { api } from "@/lib/api";

const BASE_URL = "/OrderFulfillment";

export async function getOrderFulfillments() {
    const res = await api.get(BASE_URL);
    return res.data;
}

export async function completeOrderFulfillment(
    movementId:number
){
    const res = await api.put(
        `${BASE_URL}/${movementId}/complete`
    );

    return res.data;
}

export async function cancelOrderFulfillment(
    movementId:number
){
    const res = await api.put(
        `${BASE_URL}/${movementId}/cancel`
    );

    return res.data;
}