import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Box,
    CircularProgress,
    Typography
} from '@mui/material';
import { EmptyState } from './EmptyState';

export interface Column<T> {
    id: string;
    label: string;
    render?: (row: T) => React.ReactNode;
    align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
}

export interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
    onRowClick?: (row: T) => void;
    hover?: boolean;
}

export function DataTable<T extends { id: string | number }>({
    columns,
    data,
    loading = false,
    emptyTitle = 'Brak danych',
    emptyDescription,
    onRowClick,
    hover = true,
}: DataTableProps<T>) {
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (data.length === 0) {
        return <EmptyState title={emptyTitle} description={emptyDescription} />;
    }

    return (
        <TableContainer component={Paper} elevation={1} sx={{ border: 'none' }}>
            <Table sx={{ minWidth: 650 }} aria-label="data table">
                <TableHead>
                    <TableRow>
                        {columns.map((column) => (
                            <TableCell key={column.id} align={column.align || 'left'}>
                                {column.label}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((row) => (
                        <TableRow
                            key={row.id}
                            hover={hover}
                            onClick={() => onRowClick && onRowClick(row)}
                            sx={{
                                cursor: onRowClick ? 'pointer' : 'default',
                                '&:last-child td, &:last-child th': { border: 0 }
                            }}
                        >
                            {columns.map((column) => (
                                <TableCell key={column.id} align={column.align || 'left'}>
                                    {column.render ? column.render(row) : (row as any)[column.id]}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
