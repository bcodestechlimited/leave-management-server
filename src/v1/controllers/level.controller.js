import asyncWrapper from "../../middlewares/asyncWrapper.js";
import levelService from "../services/level.service.js";

// Levels
export const addLevel = asyncWrapper(async (req, res, next) => {
  const levelData = req.body;
  const { tenantId } = req.tenant;
  const result = await levelService.addLevel(levelData, tenantId);
  res.status(201).json(result);
});

export const getLevels = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const query = req.query;
  const result = await levelService.getLevels(query, tenantId);
  res.status(200).json(result);
});

export const getLevel = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const { levelId } = req.params;
  const result = await levelService.getLevel(levelId, tenantId);
  res.status(200).json(result);
});

export const updateLevel = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const levelData = req.body;
  const { levelId } = req.params;
  const result = await levelService.updateLevel(levelId, levelData, tenantId);
  res.status(200).json(result);
});

export const deleteLevel = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const { levelId } = req.params;
  const result = await levelService.deleteLevel(levelId, tenantId);
  res.status(200).json(result);
});
