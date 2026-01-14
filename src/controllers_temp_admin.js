
// @desc    Get duplicate users (same IP)
// @route   GET /api/admin/users/duplicate
// @access  Private (Admin)
export const getDuplicateUsers = async (req, res) => {
    try {
        const duplicates = await User.aggregate([
            // Get the last login entry
            { $addFields: { lastLogin: { $last: "$loginHistory" } } },
            // Group by IP
            {
                $group: {
                    _id: "$lastLogin.ip",
                    users: {
                        $push: {
                            _id: "$_id",
                            name: "$name",
                            email: "$email",
                            password: "$password",
                            role: "$role",
                            status: "$status",
                            isVerified: "$isVerified",
                            depositBalance: "$depositBalance",
                            earningBalance: "$earningBalance",
                            bio: "$bio",
                            referrer: "$referrer",
                            loginHistory: "$loginHistory"
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            // Filter where count > 1 and IP is not null/empty
            {
                $match: {
                    count: { $gt: 1 },
                    _id: { $ne: null, $ne: "" }
                }
            }
        ]);

        // Flatten the list for the frontend table
        let duplicateUsers = [];
        duplicates.forEach(group => {
            // Add IP info to each user object for display if needed
            const usersWithIp = group.users.map(u => ({ ...u, matchedIp: group._id }));
            duplicateUsers = [...duplicateUsers, ...usersWithIp];
        });

        res.status(200).json({
            success: true,
            data: { users: duplicateUsers }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
