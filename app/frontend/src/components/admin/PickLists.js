import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SortIcon from '@mui/icons-material/Sort';
import { pickListsApi } from '../../services/api';

const PickLists = () => {
  const navigate = useNavigate();
  
  // State for API data
  const [categories, setCategories] = useState([]);
  const [pickLists, setPickLists] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // State for selected values
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPickList, setSelectedPickList] = useState('');
  const [listItems, setListItems] = useState([]);
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState({ item_id: null, value: '' });
  
  // Fetch categories when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const data = await pickListsApi.getAllCategories();
        setCategories(data);
      } catch (err) {
        console.error('Failed to load categories:', err);
        setError('Failed to load categories. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Handle category change
  const handleCategoryChange = async (event) => {
    const categoryId = event.target.value;
    setSelectedCategory(categoryId);
    setSelectedPickList(''); // Reset pick list when category changes
    setListItems([]); // Clear items
    
    if (!categoryId) return;
    
    try {
      setLoading(true);
      
      // Check if we already have the lists for this category
      if (!pickLists[categoryId]) {
        const lists = await pickListsApi.getPickListsByCategoryId(categoryId);
        setPickLists(prev => ({
          ...prev,
          [categoryId]: lists
        }));
      }
    } catch (err) {
      console.error('Failed to load pick lists:', err);
      setError('Failed to load pick lists. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle pick list change
  const handlePickListChange = async (event) => {
    const listId = event.target.value;
    setSelectedPickList(listId);
    
    if (!listId) {
      setListItems([]);
      return;
    }
    
    try {
      setLoading(true);
      const items = await pickListsApi.getItemsByListId(listId);
      setListItems(items);
    } catch (err) {
      console.error('Failed to load list items:', err);
      setError('Failed to load list items. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Add item dialog
  const handleOpenAddDialog = () => {
    setCurrentItem({ item_id: null, value: '' });
    setIsAddDialogOpen(true);
  };
  
  const handleCloseAddDialog = () => {
    setIsAddDialogOpen(false);
  };
  
  const handleAddItem = async () => {
    if (currentItem.value.trim() === '') return;
    
    try {
      setLoading(true);
      
      // Create new item
      const newItem = await pickListsApi.createItem({
        list_id: parseInt(selectedPickList),
        value: currentItem.value
      });
      
      // Add to local state
      setListItems([...listItems, newItem]);
      
      // Show success notification
      setNotification({
        open: true,
        message: 'Item added successfully',
        severity: 'success'
      });
      
    } catch (err) {
      console.error('Failed to add item:', err);
      setError('Failed to add item. Please try again.');
      
      setNotification({
        open: true,
        message: 'Failed to add item',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      handleCloseAddDialog();
    }
  };
  
  // Edit item dialog
  const handleOpenEditDialog = (item) => {
    setCurrentItem({ ...item });
    setIsEditDialogOpen(true);
  };
  
  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
  };
  
  const handleEditItem = async () => {
    if (currentItem.value.trim() === '') return;
    
    try {
      setLoading(true);
      
      // Update item in API
      const updatedItem = await pickListsApi.updateItem(currentItem.item_id, {
        value: currentItem.value
      });
      
      // Update in local state
      const updatedItems = listItems.map(item => 
        item.item_id === currentItem.item_id ? updatedItem : item
      );
      
      setListItems(updatedItems);
      
      // Show success notification
      setNotification({
        open: true,
        message: 'Item updated successfully',
        severity: 'success'
      });
      
    } catch (err) {
      console.error('Failed to update item:', err);
      setError('Failed to update item. Please try again.');
      
      setNotification({
        open: true,
        message: 'Failed to update item',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      handleCloseEditDialog();
    }
  };
  
  // Handle delete item dialog
  const handleOpenDeleteDialog = (item) => {
    setCurrentItem({ ...item });
    setIsDeleteDialogOpen(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
  };
  
  const handleDeleteItem = async () => {
    try {
      setLoading(true);
      
      console.log('About to delete item:', {
        item_id: currentItem.item_id,
        type: typeof currentItem.item_id,
        parsed: parseInt(currentItem.item_id)
      });
      
      // Delete item from API
      await pickListsApi.deleteItem(currentItem.item_id);
      console.log('Item deleted successfully on server');
      
      // Update local state - this line is crucial!
      const newListItems = listItems.filter(item => item.item_id !== currentItem.item_id);
      setListItems(newListItems);
      console.log('Local state updated, removed item from list');
      
      // Show success notification
      setNotification({
        open: true,
        message: 'Item deleted successfully',
        severity: 'success'
      });
      
    } catch (err) {
      console.error('Failed to delete item:', err);
      setError('Failed to delete item. Please try again.');
      
      setNotification({
        open: true,
        message: 'Failed to delete item: ' + (err.message || 'Unknown error'),
        severity: 'error'
      });
    } finally {
      setLoading(false);
      handleCloseDeleteDialog(); // Use your existing close dialog function instead
    }
  };
  
  // Handle moving items up and down in the list
  const handleMoveItem = async (index, direction) => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === listItems.length - 1)
    ) {
      return; // Can't move if at the beginning or end of the list
    }
    
    try {
      setLoading(true);
      
      const newItems = [...listItems];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      // Swap display orders
      const tempOrder = newItems[index].display_order;
      newItems[index].display_order = newItems[targetIndex].display_order;
      newItems[targetIndex].display_order = tempOrder;
      
      // Swap the items for UI
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      
      // Update in API
      await pickListsApi.reorderItems(parseInt(selectedPickList), [
        { item_id: newItems[index].item_id, display_order: newItems[index].display_order },
        { item_id: newItems[targetIndex].item_id, display_order: newItems[targetIndex].display_order }
      ]);
      
      // Update local state
      setListItems(newItems);
      
    } catch (err) {
      console.error('Failed to move item:', err);
      setError('Failed to move item. Please try again.');
      
      setNotification({
        open: true,
        message: 'Failed to reorder items',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  

  // Handle sorting the list alphabetically
  const handleSortAlphabetically = async () => {
    try {
      setLoading(true);
      
      // Make sure we have items to sort
      if (!Array.isArray(listItems) || listItems.length <= 1) {
        setNotification({
          open: true,
          message: 'Not enough items to sort',
          severity: 'warning'
        });
        return;
      }
      
      // Sort items alphabetically
      const sortedItems = [...listItems].sort((a, b) => 
        a.value.localeCompare(b.value)
      );
      
      // Create properly formatted item orders
      const itemOrders = sortedItems.map((item, index) => ({
        item_id: parseInt(item.item_id),
        display_order: index
      }));
      
      // Update in API - but don't store the result since we don't use it
      await pickListsApi.reorderItems(parseInt(selectedPickList), itemOrders);
      
      // Update the display order in the local state
      const updatedItems = sortedItems.map((item, index) => ({
        ...item,
        display_order: index
      }));
      
      setListItems(updatedItems);
      
      // Show success notification
      setNotification({
        open: true,
        message: 'Items sorted successfully',
        severity: 'success'
      });
      
    } catch (err) {
      console.error('Failed to sort items:', err);
      
      setNotification({
        open: true,
        message: `Failed to sort items: ${err.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle notification close
  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification({ ...notification, open: false });
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Pick Lists
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Manage Pick Lists
        </Typography>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Pick lists are predefined sets of values used in dropdown menus throughout the application.
            Select a category and a specific pick list to view and manage its values.
          </Typography>
          
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => navigate('/admin')}
            sx={{ mb: 3 }}
          >
            Back to Admin Dashboard
          </Button>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {/* Show error if present */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Dropdowns for category and pick list selection */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel id="category-select-label">Select a Category</InputLabel>
            <Select
              labelId="category-select-label"
              id="category-select"
              value={selectedCategory}
              label="Select a Category"
              onChange={handleCategoryChange}
              disabled={loading}
            >
              {categories.map(category => (
                <MenuItem key={category.category_id} value={category.category_id}>
                  {category.category_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth disabled={!selectedCategory || loading}>
            <InputLabel id="picklist-select-label">Select a Pick List</InputLabel>
            <Select
              labelId="picklist-select-label"
              id="picklist-select"
              value={selectedPickList}
              label="Select a Pick List"
              onChange={handlePickListChange}
            >
              {selectedCategory && pickLists[selectedCategory]?.map(list => (
                <MenuItem key={list.list_id} value={list.list_id}>
                  {list.list_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        
        {/* List Items Table */}
        {selectedPickList && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                List Items
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Sort items alphabetically">
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    startIcon={<SortIcon />}
                    onClick={handleSortAlphabetically}
                    disabled={loading || listItems.length <= 1}
                  >
                    Sort Alphabetically
                  </Button>
                </Tooltip>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<AddIcon />}
                  onClick={handleOpenAddDialog}
                  disabled={loading}
                >
                  Add New Item
                </Button>
              </Box>
            </Box>
            
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                <CircularProgress />
              </Box>
            )}
            
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Value</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {listItems.length > 0 ? (
                    listItems.map((item, index) => (
                      <TableRow key={item.item_id}>
                        <TableCell component="th" scope="row">
                          {item.value}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Move up">
                            <IconButton 
                              aria-label="move up" 
                              onClick={() => handleMoveItem(index, 'up')}
                              disabled={index === 0 || loading}
                              size="small"
                            >
                              <ArrowUpwardIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Move down">
                            <IconButton 
                              aria-label="move down" 
                              onClick={() => handleMoveItem(index, 'down')}
                              disabled={index === listItems.length - 1 || loading}
                              size="small"
                            >
                              <ArrowDownwardIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton 
                              aria-label="edit" 
                              onClick={() => handleOpenEditDialog(item)}
                              color="primary"
                              disabled={loading}
                              size="small"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              aria-label="delete" 
                              onClick={() => handleOpenDeleteDialog(item)}
                              color="error"
                              disabled={loading}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        {loading ? 'Loading items...' : 'No items found. Add a new item to get started.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Paper>
      
      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onClose={handleCloseAddDialog}>
        <DialogTitle>Add New Item</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter the value for the new item:
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="value"
            label="Value"
            type="text"
            fullWidth
            variant="outlined"
            value={currentItem.value}
            onChange={(e) => setCurrentItem({ ...currentItem, value: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog} disabled={loading}>Cancel</Button>
          <Button 
            onClick={handleAddItem} 
            variant="contained" 
            color="primary"
            disabled={loading || !currentItem.value.trim()}
          >
            {loading ? <CircularProgress size={24} /> : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onClose={handleCloseEditDialog}>
        <DialogTitle>Edit Item</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Update the value for this item:
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="value"
            label="Value"
            type="text"
            fullWidth
            variant="outlined"
            value={currentItem.value}
            onChange={(e) => setCurrentItem({ ...currentItem, value: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} disabled={loading}>Cancel</Button>
          <Button 
            onClick={handleEditItem} 
            variant="contained" 
            color="primary"
            disabled={loading || !currentItem.value.trim()}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Item Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Item</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{currentItem.value}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={loading}>Cancel</Button>
          <Button 
            onClick={handleDeleteItem} 
            variant="contained" 
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PickLists;