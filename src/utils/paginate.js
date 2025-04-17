// Helper function for pagination
export const paginate = async ({
  model,
  query = {},
  page = 1,
  limit = 10,
  sort = { createdAt: -1 },
  populateOptions = [],
  select = [],
  excludeById = null,
  excludeField = "_id",
}) => {
  const skip = (page - 1) * limit;

  if (excludeById !== null) {
    query[excludeField] = { $ne: excludeById };
  }

  let queryBuilder = model
    .find(query)
    .skip(skip)
    .limit(limit)
    .sort(sort)
    .select(select);

  populateOptions.forEach((option) => {
    queryBuilder = queryBuilder.populate(option);
  });

  const documents = await queryBuilder;

  const totalCount = await model.countDocuments();
  const filteredCount = await model.countDocuments(query);
  const totalPages = Math.ceil(filteredCount / limit);

  return {
    documents,
    pagination: {
      totalCount,
      filteredCount,
      totalPages,
      page,
      limit,
    },
  };
};
