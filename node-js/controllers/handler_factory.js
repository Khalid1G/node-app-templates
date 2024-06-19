const catch_async = require("../utils/catch_async");
const AppError = require("../utils/app_error");
const APIFeatures = require("../utils/api_features");

/**
 * Controller function for retrieving all documents of a specified model.
 * @param {Model} Model - The Mongoose model for the documents.
 * @param {Array} populateOptions - Optional: An array of options to populate references.
 * @returns {Function} - The controller function that retrieves and sends the documents.
 */
exports.getAll = (Model, populateOptions) =>
  catch_async(async (req, res) => {
    const opt = req.queryFilter || {};

    let query = Model.find(opt); // Create initial query using Model.find() and the query filter

    if (populateOptions) {
      for (const option of populateOptions) {
        query = query.populate(option);
      }
    }

    // Applies various API features (filtering, field limiting, sorting, pagination) to the query and executes it as a lean query (returns plain JavaScript objects)
    const docs = await new APIFeatures(query, req.query)
      .filter()
      .limitFields()
      .sort()
      .pagination()
      .query.lean();

    res.status(200).json({
      status: "success",
      results: docs.length,
      data: {
        [Model.collection.collectionName.toLowerCase()]: docs,
      },
    });
  });

/**
 * Controller function for retrieving a single document of a specified model by ID.
 * @param {Model} Model - The Mongoose model for the document.
 * @param {Array} populateOptions - Optional: An array of options to populate references.
 * @returns {Function} - The controller function that retrieves and sends the document.
 */
exports.getOne = (Model, populateOptions) =>
  catch_async(async (req, res, next) => {
    let query = Model.findById(req.params.id);

    if (populateOptions) query = query.populate(populateOptions);

    const features = new APIFeatures(query, req.query).limitFields();
    const doc = await features.query.lean(); // Executes the query and converts the document to a plain JavaScript object

    if (!doc) {
      return next(
        new AppError(
          `No ${Model.modelName.toLowerCase()} found with that ID`,
          404
        )
      );
    }

    return res.status(200).json({
      status: "success",
      data: {
        [Model.modelName.toLowerCase()]: doc,
      },
    });
  });

/**
 * Controller function for creating a new document of a specified model.
 * @param {Model} Model - The Mongoose model for the document.
 * @returns {Function} - The controller function that creates and sends the document.
 */
exports.createOne = (Model) =>
  catch_async(async (req, res) => {
    const doc = await Model.create(req.body);
    res.status(201).json({
      status: "success",
      data: {
        [Model.modelName.toLowerCase()]: doc,
      },
    });
  });

/**
 * Controller function for updating a document of a specified model.
 * @param {Model} Model - The Mongoose model for the document.
 * @returns {Function} - The controller function that updates and sends the updated document.
 */
exports.updateOne = (Model) =>
  catch_async(async (req, res, next) => {
    const doc = await Model.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!doc) {
      return next(
        new AppError(
          `No ${Model.modelName.toLowerCase()} found with that ID`,
          404
        )
      );
    }

    return res.status(200).json({
      status: "success",
      data: {
        [Model.modelName.toLowerCase()]: doc,
      },
    });
  });

/**
 * Controller function for deleting a document of a specified model.
 * @param {Model} Model - The Mongoose model for the document.
 * @returns {Function} - The controller function that deletes the document.
 */
exports.deleteOne = (Model) =>
  catch_async(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id).lean();
    if (!doc) {
      return next(
        new AppError(
          `No ${Model.modelName.toLowerCase()} found with that ID`,
          404
        )
      );
    }
    return res.status(204).json({
      status: "success",
      data: null,
    });
  });

/**
 * Controller function for soft deleting a document of a specified model.
 * @param {Model} Model - The Mongoose model for the document.
 * @returns {Function} - The controller function that performs the soft deletion.
 */
exports.softDeleteOne = (Model) =>
  catch_async(async (req, res, next) => {
    const doc = await Model.findById(req.params.id);

    if (!doc) {
      return next(
        new AppError(
          `No ${Model.modelName.toLowerCase()} found with that ID`,
          404
        )
      );
    }

    await doc.softDelete();

    return res.status(204).json({
      status: "success",
      data: null,
    });
  });

/**
 * Controller function for restoring a soft-deleted document of a specified model.
 * @param {Model} Model - The Mongoose model for the document.
 * @returns {Function} - The controller function that performs the restoration.
 */
exports.restoreOne = (Model) =>
  catch_async(async (req, res, next) => {
    const { id } = req.params;

    const doc = await Model.findOneAndUpdate(
      { _id: id, deleted: true },
      { deleted: false },
      { new: true }
    ).lean();

    if (!doc) {
      return next(
        new AppError(`${Model.modelName} Not found or Already restored.`, 404)
      );
    }

    return res.status(200).json({
      status: "success",
      data: { [Model.modelName.toLowerCase()]: doc },
    });
  });
