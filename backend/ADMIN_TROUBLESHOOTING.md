# Admin Panel Troubleshooting Guide

## Issue: Data Not Displaying in SQLAdmin Panel

### Quick Fixes Applied

1. **Improved Error Handling**: Added comprehensive error handling and logging to all admin views
2. **Fixed Relationship Loading**: Changed from `selectinload` to `joinedload` for better performance
3. **Safe Formatters**: Added `safe_formatter` wrapper to prevent column formatter crashes
4. **Better Null Checking**: Added null checks in all helper functions

### Common Causes and Solutions

#### 1. Database Connection Issues
```bash
# Test database connection
cd /workspace/backend
python3 test_admin_data.py
```

#### 2. Authentication Issues
- Default admin credentials: `admin` / `admin123`
- Check if you can access `/admin` endpoint
- Verify session is being maintained

#### 3. Column Formatter Errors
- Check browser console for JavaScript errors
- Look for Python exceptions in server logs
- Use simplified admin views for testing:

```python
# In main.py, temporarily replace complex admin views
from admin_debug import SIMPLE_ADMIN_VIEWS
for view in SIMPLE_ADMIN_VIEWS:
    admin.add_view(view)
```

#### 4. Data Loading Issues
- Verify tables have data: Run `test_admin_data.py`
- Check if relationships are properly configured
- Test with simple queries first

### Step-by-Step Debugging

1. **Check Database Connectivity**
   ```bash
   python3 test_admin_data.py
   ```

2. **Enable Debug Logging**
   ```python
   # Add to main.py
   import logging
   logging.basicConfig(level=logging.DEBUG)
   ```

3. **Test Simple Admin Views**
   ```python
   # Use admin_debug.py views instead of complex ones
   ```

4. **Check Browser Network Tab**
   - Look for failed AJAX requests to `/admin/api/`
   - Check for 500 errors or timeouts

5. **Verify SQLAdmin Version Compatibility**
   ```bash
   pip list | grep sqladmin
   ```

### Fixed Issues in admin.py

- ✅ Added proper null checking in all formatters
- ✅ Replaced debug prints with proper logging
- ✅ Fixed relationship loading with joinedload
- ✅ Added safe_formatter wrapper for error handling
- ✅ Improved attribute access with getattr() and defaults
- ✅ Fixed file URL paths (changed /Uploads to /uploads)

### Environment Variables Check

Ensure these are set correctly in `.env`:
```
DB_HOST=db  # or localhost if not using Docker
DB_NAME=fullstack_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_PORT=5432
```

### Emergency Fallback

If issues persist, use the simple admin views:

```python
# In main.py, replace the complex admin import with:
from admin_debug import SIMPLE_ADMIN_VIEWS
for view in SIMPLE_ADMIN_VIEWS:
    admin.add_view(view)
```

This will give you basic admin functionality while you debug the complex formatters.

### Logs to Check

1. **FastAPI application logs** - Look for SQLAlchemy errors
2. **Browser console** - Check for JavaScript errors
3. **Network tab** - Look for failed API calls
4. **Database logs** - Check for connection issues

### Test URLs

- Main app: `http://localhost/`
- Admin panel: `http://localhost/admin`
- Health check: `http://localhost/health`

### Performance Notes

The updated admin.py uses `joinedload` instead of `selectinload` which should be faster for the admin panel use case, as it loads all related data in a single query rather than multiple queries.