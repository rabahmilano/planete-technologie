import prisma from "../config/dbConfig.js";

export const getMaxValue = async (
  modelName,
  columnName,
  condition,
  defaultValue = 1
) => {
  const options = {
    _max: {
      [columnName]: true,
    },
  };
  if (condition) {
    options.where = condition;
  }

  const result = await prisma[modelName].aggregate(options);
  return result._max[columnName] !== null
    ? result._max[columnName] + 1
    : defaultValue;
};

export const getSpecialDate = (interval = 0) => {
  const today = new Date();
  const date = new Date(today);
  date.setDate(date.getDate() + interval);
  date.setMinutes(date.getMinutes() + 60);

  return date;
};
