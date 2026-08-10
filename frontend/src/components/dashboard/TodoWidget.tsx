import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, IconButton, List, ListItem, ListItemText, Checkbox, alpha } from '@mui/material';
import { Add, DeleteOutline } from '@mui/icons-material';
import { AppCard } from '../../ui';

interface Todo {
    id: string;
    text: string;
    completed: boolean;
}

export const TodoWidget: React.FC<{ userId: string }> = ({ userId }) => {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [newTodo, setNewTodo] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem(`todos_${userId}`);
        if (stored) {
            try {
                setTodos(JSON.parse(stored));
            } catch (e) {
                console.error('Error parsing todos', e);
            }
        }
    }, [userId]);

    const saveTodos = (newTodos: Todo[]) => {
        setTodos(newTodos);
        localStorage.setItem(`todos_${userId}`, JSON.stringify(newTodos));
    };

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTodo.trim()) return;
        const todo: Todo = { id: Date.now().toString(), text: newTodo.trim(), completed: false };
        saveTodos([...todos, todo]);
        setNewTodo('');
    };

    const handleToggle = (id: string) => {
        const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        saveTodos(updated);
    };

    const handleDelete = (id: string) => {
        const updated = todos.filter(t => t.id !== id);
        saveTodos(updated);
    };

    return (
        <AppCard sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3, borderRadius: 4, backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>Zadania na dziś</Typography>
            <Box component="form" onSubmit={handleAdd} sx={{ display: 'flex', mb: 2 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Dodaj zadanie..."
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, borderTopRightRadius: 0, borderBottomRightRadius: 0 } }}
                />
                <IconButton type="submit" sx={{ bgcolor: 'primary.main', color: 'white', borderRadius: 2, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, '&:hover': { bgcolor: 'primary.dark' } }}>
                    <Add />
                </IconButton>
            </Box>
            <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0, maxHeight: 300 }}>
                {todos.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>Brak zadań na dziś. Odpocznij!</Typography>
                )}
                {todos.map(todo => (
                    <ListItem
                        key={todo.id}
                        dense
                        sx={{
                            mb: 1,
                            borderRadius: 2,
                            bgcolor: todo.completed ? alpha('#000', 0.02) : alpha('#1976d2', 0.04),
                            textDecoration: todo.completed ? 'line-through' : 'none',
                            color: todo.completed ? 'text.disabled' : 'text.primary',
                        }}
                        secondaryAction={
                            <IconButton edge="end" size="small" onClick={() => handleDelete(todo.id)} sx={{ color: 'error.main', opacity: 0.7, '&:hover': { opacity: 1 } }}>
                                <DeleteOutline fontSize="small" />
                            </IconButton>
                        }
                    >
                        <Checkbox
                            edge="start"
                            checked={todo.completed}
                            onChange={() => handleToggle(todo.id)}
                            size="small"
                        />
                        <ListItemText primary={todo.text} primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
                    </ListItem>
                ))}
            </List>
        </AppCard>
    );
};
