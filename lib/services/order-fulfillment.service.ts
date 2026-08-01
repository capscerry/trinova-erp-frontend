import { api } from "@/lib/api";

const BASE_URL = "/OrderFulfillment";

export async function getOrderFulfillments() {
    const res = await api.get(BASE_URL);
    return res.data;
}

/**
 * Backend has no single-record GET endpoint -- fetch the full list and
 * filter client-side, same pattern used for Purchase Return / Payment.
 */
export async function getOrderFulfillmentById(movementId: number) {
    const list = await getOrderFulfillments();
    const arr = Array.isArray(list) ? list : list?.data ?? [];
    return (
        arr.find((m: any) => Number(m.movement_id) === Number(movementId)) ?? null
    );
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