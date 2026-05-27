import { api } from "../api";

export const getUoms = async () => {

  const res = await api.get(
    "/MasterUom/GetAllMasterUom"
  );

  return res.data;
};