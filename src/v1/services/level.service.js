import Level from "../models/level.model.js"; // Adjust path as needed
import ApiError from "../../utils/apiError.js";
import ApiSuccess from "../../utils/apiSuccess.js";
import { paginate } from "../../utils/paginate.js";

async function getLevelById(levelId, tenantId, useLean = false, populate = []) {
  if (!levelId) {
    throw ApiError.badRequest("LevelId not provided");
  }
  const levelQuery = Level.findOne({ _id: levelId, tenantId });
  if (populate.length > 0) {
    levelQuery.populate(populate);
  }
  const level = useLean ? await levelQuery.lean() : await levelQuery;

  if (!level) {
    throw ApiError.badRequest("No level with the levelId provided");
  }

  return level;
}

async function addLevel(levelData = {}, tenantId) {
  const { name, description } = levelData;

  const existingLevel = await Level.findOne({ name, tenantId });

  if (existingLevel) {
    throw ApiError.badRequest("A level with this name already exists.");
  }

  // Create a new level
  const level = new Level({
    name,
    description,
    tenantId,
  });
  await level.save();
  return ApiSuccess.created("Level added successfully", level);
}

async function getLevels(query = {}, tenantId) {
  const { page = 1, limit = 10, search, sort = { createdAt: -1 } } = query;

  const filter = { tenantId };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const populateOptions = [
    {
      path: "leaveTypes",
    },
  ];

  const { documents: levels, pagination } = await paginate({
    model: Level,
    query: filter,
    page,
    limit,
    sort,
    populateOptions,
  });

  return ApiSuccess.created("Levels retrieved successfully", {
    levels,
    pagination,
  });
}

async function getLevel(levelId, tenantId) {
  if (!levelId) {
    throw ApiError.badRequest("LevelId not provided");
  }
  const level = await getLevelById(levelId, tenantId);

  return ApiSuccess.created("Level retrieved successfully", { level });
}

async function updateLevel(levelId, levelData, tenantId) {
  if (!levelId) {
    throw ApiError.badRequest("LevelId not provided");
  }

  const level = await Level.findOneAndUpdate(
    { _id: levelId, tenantId },
    { ...levelData },
    { runValidators: true, new: true }
  );

  if (!level) {
    throw ApiError.badRequest("No level found with the provided levelId");
  }
  // await level.save();
  return ApiSuccess.created("Level updated successfully", level);
}

async function deleteLevel(levelId, tenantId) {
  if (!levelId) {
    throw ApiError.badRequest("LevelId not provided");
  }

  const level = await getLevelById(levelId, tenantId);

  // Delete the level
  await level.deleteOne();
  return ApiSuccess.created("Level deleted successfully", { level });
}

const checkLeaveTypeExistsInLevel = async (levelId, leaveTypeId) => {
  // Find the level and check if leaveTypeId exists in leaveTypes
  const level = await Level.findOne({
    _id: levelId,
    leaveTypes: leaveTypeId, // Match leaveTypeId in the leaveTypes array
  });

  if (level) {
    return ApiError.badRequest("This leave type already exists in this level");
  }
};

export default {
  addLevel,
  getLevels,
  getLevel,
  getLevelById,
  updateLevel,
  deleteLevel,
  checkLeaveTypeExistsInLevel,
};
