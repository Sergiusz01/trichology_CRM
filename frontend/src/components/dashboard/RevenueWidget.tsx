import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { AttachMoney, TrendingUp } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AppCard } from '../../ui';

interface WeeklyRevenue {
    plannedRevenue: number;
    completedRevenue: number;
    totalExpectedRevenue: number;
    visitsThisWeek: {
        zaplanowana: number;
        odbyta: number;
        nieobecnosc: number;
        anulowana: number;
    };
}

export const RevenueWidget: React.FC<{ data: WeeklyRevenue }> = ({ data }) => {
    // Przygotowanie danych do wykresu (uproszczone z racji braku danych po dniach - zrobimy wykres kategoryczny)
    const chartData = [
        { name: 'Oczekiwane', value: data.plannedRevenue, color: '#FF9500' },
        { name: 'Zrealizowane', value: data.completedRevenue, color: '#34C759' }
    ];

    return (
        <AppCard sx={{ height: '100%', p: 3, borderRadius: 4, backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid', borderColor: alpha('#1976d2', 0.1) }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#34C759', 0.1) }}>
                        <AttachMoney sx={{ color: '#34C759' }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>Przychody w tym tygodniu</Typography>
                        <Typography variant="body2" color="text.secondary">Zrealizowane vs Oczekiwane</Typography>
                    </Box>
                </Box>
                <TrendingUp sx={{ color: alpha('#34C759', 0.5), fontSize: 32 }} />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 4, mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#34C759' }}>
                        {data.completedRevenue.toLocaleString('pl-PL')} zł
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Zrealizowane</Typography>
                </Box>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#FF9500' }}>
                        {data.plannedRevenue.toLocaleString('pl-PL')} zł
                    </Typography>
                    <Typography variant="body2" color="text.secondary">W planach</Typography>
                </Box>
            </Box>

            <Box sx={{ height: 200, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} tickFormatter={(val) => `${val}zł`} />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(value: number) => [`${value} zł`, 'Przychód']} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </Box>
        </AppCard>
    );
};
