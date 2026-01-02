import { Request, Response } from 'express';
import Prediction from '@/models/prediction';
import logger from '@/utils/logger';

const AdminController = {
    getStats: async (req: Request, res: Response) => {
        try {
            const total = await Prediction.countDocuments();
            const correct = await Prediction.countDocuments({ classification: 'CORRECT' });
            const incorrect = await Prediction.countDocuments({ classification: 'INCORRECT' });

            const recent = await Prediction.find().sort({ timestamp: -1 }).limit(10);

            // Group by hours for graph (last 24h)
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            const hourlyStats = await Prediction.aggregate([
                { $match: { timestamp: { $gte: yesterday } } },
                {
                    $group: {
                        _id: { $hour: "$timestamp" },
                        count: { $sum: 1 },
                        correct: {
                            $sum: { $cond: [{ $eq: ["$classification", "CORRECT"] }, 1, 0] }
                        }
                    }
                },
                { $sort: { "_id": 1 } }
            ]);

            res.json({
                stats: {
                    total,
                    correct,
                    incorrect,
                    accuracy: total > 0 ? ((correct / total) * 100).toFixed(2) : 0
                },
                recent,
                graph: hourlyStats
            });
        } catch (err: any) {
            logger.error('Admin Stats Error:', err.message);
            res.status(500).json({ error: 'Server Error' });
        }
    },

    clearLogs: async (req: Request, res: Response) => {
        try {
            await Prediction.deleteMany({});
            res.json({ message: 'Logs cleared' });
        } catch (err: any) {
            res.status(500).json({ error: 'Failed to clear logs' });
        }
    }
};

export default AdminController;
