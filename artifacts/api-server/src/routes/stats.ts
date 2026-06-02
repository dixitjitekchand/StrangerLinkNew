import { Router, type IRouter } from "express";
import { getStats, getRooms } from "../lib/socket";
import { GetStatsResponse, ListRoomsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stats", (_req, res): void => {
  res.json(GetStatsResponse.parse(getStats()));
});

router.get("/rooms", (_req, res): void => {
  res.json(ListRoomsResponse.parse(getRooms()));
});

export default router;
