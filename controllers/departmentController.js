const Department = require('../models/Department');
const { AppError } = require('../middleware/errorHandler');

/**
 * POST /api/departments
 * Create a new department (Admin only)
 */
const createDepartment = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const existing = await Department.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      throw new AppError('A department with this name already exists.', 409, 'DUPLICATE_DEPARTMENT');
    }

    const department = await Department.create({ name, description });

    res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      data: department
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/departments
 * List all departments (public)
 */
const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      message: 'Departments retrieved successfully.',
      data: departments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/departments/:id
 * Get single department (public)
 */
const getDepartmentById = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      message: 'Department retrieved successfully.',
      data: department
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/departments/:id
 * Update department (Admin only)
 */
const updateDepartment = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const department = await Department.findById(req.params.id);
    if (!department) {
      throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
    }

    // Check for duplicate name if name is being changed
    if (name && name !== department.name) {
      const existing = await Department.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
      if (existing) {
        throw new AppError('A department with this name already exists.', 409, 'DUPLICATE_DEPARTMENT');
      }
    }

    if (name) department.name = name;
    if (description !== undefined) department.description = description;

    await department.save();

    res.status(200).json({
      success: true,
      message: 'Department updated successfully.',
      data: department
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/departments/:id
 * Soft-delete department (Admin only)
 */
const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
    }

    department.isActive = false;
    await department.save();

    res.status(200).json({
      success: true,
      message: 'Department deleted successfully.',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createDepartment, getDepartments, getDepartmentById, updateDepartment, deleteDepartment };
