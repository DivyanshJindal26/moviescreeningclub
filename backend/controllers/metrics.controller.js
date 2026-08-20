const Memdata = require('@/models/membership.model')

const getMonthlyMetrics = async (req, res) => {
  try {
    const { year, month } = req.params
    const byDesignation = await Memdata.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $match: {
          purchasedate: {
            $gte: new Date(year, month - 1, 1),
            $lt: new Date(year, month, 1)
          },
          txnId: { $nin: ['test', 'coreteam', 'office'] }
        }
      },
      {
        $group: {
          _id: {
            membershipType: '$memtype',
            designation: '$user.designation'
          },
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      },
      {
        $sort: {
          '_id.designation': 1,
          '_id.membershipType': 1
        }
      }
    ])

    const data = {
      count: byDesignation.reduce((acc, curr) => acc + curr.count, 0),
      totalAmount: byDesignation.reduce((acc, curr) => acc + curr.amount, 0),
      byMembership: byDesignation.reduce(
        (acc, curr) => {
          if (!acc[curr._id.membershipType]) {
            acc[curr._id.membershipType] = {
              count: 0,
              totalAmount: 0,
              memtypeCounts: {
                btech: 0,
                'mtech/phd': 0,
                'faculty/staff': 0,
                other: 0
              }
            }
          }
          acc[curr._id.membershipType].count += curr.count
          acc[curr._id.membershipType].totalAmount += curr.amount
          acc[curr._id.membershipType].memtypeCounts = byDesignation.reduce(
            (a, c) => {
              if (!a[c._id.designation]) {
                a[c._id.designation] = 0
              }
              if (c._id.membershipType === curr._id.membershipType) {
                a[c._id.designation] += c.count
              }
              return a
            },
            {
              btech: 0,
              'mtech/phd': 0,
              'faculty/staff': 0,
              other: 0
            }
          )
          return acc
        },
        {
          base: {
            count: 0,
            totalAmount: 0,
            memtypeCounts: {
              btech: 0,
              'mtech/phd': 0,
              'faculty/staff': 0,
              other: 0
            }
          },
          silver: {
            count: 0,
            totalAmount: 0,
            memtypeCounts: {
              btech: 0,
              'mtech/phd': 0,
              'faculty/staff': 0,
              other: 0
            }
          },
          gold: {
            count: 0,
            totalAmount: 0,
            memtypeCounts: {
              btech: 0,
              'mtech/phd': 0,
              'faculty/staff': 0,
              other: 0
            }
          },
          diamond: {
            count: 0,
            totalAmount: 0,
            memtypeCounts: {
              btech: 0,
              'mtech/phd': 0,
              'faculty/staff': 0,
              other: 0
            }
          }
        }
      )
    }

    res.header('cache-control', 'public, max-age=1800')
    res.json(data)
  } catch (err) {
    res.status(500).send(err.message)
  }
}

module.exports = {
  getMonthlyMetrics
}
