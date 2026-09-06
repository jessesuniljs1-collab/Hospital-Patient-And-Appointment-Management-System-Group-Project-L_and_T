const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Department = require('../models/Department');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/admin/reports/appointments
 * Appointment statistics — daily/weekly counts
 * Uses MongoDB aggregation pipeline
 */
const getAppointmentReports = async (req, res, next) => {
  try {
    const { period = 'daily', startDate, endDate, days = 30 } = req.query;

    // Operational window: covers past N days and next N days (or specified range)
    const end = endDate ? new Date(endDate) : new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000);
    end.setHours(23, 59, 59, 999);
    const start = startDate ? new Date(startDate) : new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);

    let groupFormat;
    if (period === 'weekly') {
      groupFormat = { $isoWeek: '$date' };
    } else {
      // daily
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
    }

    const pipeline = [
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            period: groupFormat,
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.period',
          total: { $sum: '$count' },
          byStatus: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const stats = await Appointment.aggregate(pipeline);

    // Overall totals
    const overallStats = await Appointment.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalAppointments = overallStats.reduce((sum, s) => sum + s.count, 0);

    res.status(200).json({
      success: true,
      message: 'Appointment reports retrieved successfully.',
      data: {
        period,
        dateRange: { start, end },
        totalAppointments,
        statusBreakdown: overallStats,
        timeline: stats
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/reports/departments
 * Department load — appointment count per department
 */
const getDepartmentLoadReport = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    const start = new Date();
    start.setDate(start.getDate() - parseInt(days));
    start.setHours(0, 0, 0, 0);

    // Get all doctors with their department info
    const doctors = await Doctor.find().select('_id departmentId');
    const doctorDeptMap = {};
    doctors.forEach(d => {
      doctorDeptMap[d._id.toString()] = d.departmentId;
    });

    // Aggregate appointments by doctor, then map to department
    const appointmentsByDoctor = await Appointment.aggregate([
      {
        $match: {
          date: { $gte: start }
        }
      },
      {
        $group: {
          _id: '$doctorId',
          totalAppointments: { $sum: 1 },
          completedAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          },
          cancelledAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    // Group by department
    const departmentLoad = {};
    for (const item of appointmentsByDoctor) {
      const deptId = doctorDeptMap[item._id.toString()];
      if (!deptId) continue;
      const key = deptId.toString();
      if (!departmentLoad[key]) {
        departmentLoad[key] = {
          departmentId: deptId,
          totalAppointments: 0,
          completedAppointments: 0,
          cancelledAppointments: 0
        };
      }
      departmentLoad[key].totalAppointments += item.totalAppointments;
      departmentLoad[key].completedAppointments += item.completedAppointments;
      departmentLoad[key].cancelledAppointments += item.cancelledAppointments;
    }

    // Populate department names
    const departments = await Department.find().select('name');
    const deptNameMap = {};
    departments.forEach(d => { deptNameMap[d._id.toString()] = d.name; });

    const report = Object.values(departmentLoad).map(item => ({
      department: deptNameMap[item.departmentId.toString()] || 'Unknown',
      ...item
    })).sort((a, b) => b.totalAppointments - a.totalAppointments);

    res.status(200).json({
      success: true,
      message: 'Department load report retrieved successfully.',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/reports/doctors
 * Doctor utilization — appointments per doctor over a period
 */
const getDoctorUtilizationReport = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    const start = new Date();
    start.setDate(start.getDate() - parseInt(days));
    start.setHours(0, 0, 0, 0);

    const utilization = await Appointment.aggregate([
      {
        $match: {
          date: { $gte: start }
        }
      },
      {
        $group: {
          _id: '$doctorId',
          totalAppointments: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
          },
          noShow: {
            $sum: { $cond: [{ $eq: ['$status', 'No-show'] }, 1, 0] }
          },
          booked: {
            $sum: { $cond: [{ $eq: ['$status', 'Booked'] }, 1, 0] }
          },
          confirmed: {
            $sum: { $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0] }
          }
        }
      },
      { $sort: { totalAppointments: -1 } }
    ]);

    // Populate doctor info
    const doctorIds = utilization.map(u => u._id);
    const doctors = await Doctor.find({ _id: { $in: doctorIds } })
      .populate('userId', 'name email')
      .populate('departmentId', 'name');

    const doctorMap = {};
    doctors.forEach(d => {
      doctorMap[d._id.toString()] = {
        name: d.userId ? d.userId.name : 'Unknown',
        email: d.userId ? d.userId.email : '',
        specialization: d.specialization,
        department: d.departmentId ? d.departmentId.name : 'Unknown'
      };
    });

    const report = utilization.map(item => ({
      doctor: doctorMap[item._id.toString()] || { name: 'Unknown' },
      totalAppointments: item.totalAppointments,
      completed: item.completed,
      cancelled: item.cancelled,
      noShow: item.noShow,
      booked: item.booked,
      confirmed: item.confirmed,
      completionRate: item.totalAppointments > 0
        ? Math.round((item.completed / item.totalAppointments) * 100) + '%'
        : '0%'
    }));

    res.status(200).json({
      success: true,
      message: 'Doctor utilization report retrieved successfully.',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAppointmentReports, getDepartmentLoadReport, getDoctorUtilizationReport };
