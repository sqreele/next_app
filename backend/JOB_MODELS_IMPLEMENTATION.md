# Job Models Implementation

## Overview
This document describes the implementation of Job models with many-to-many relationships as requested. The implementation includes a complete CRUD system with database models, API endpoints, and relationship management.

## Database Schema

### Job Model
The `Job` model includes the following fields:
- `id` (Primary Key)
- `title` (String, max 200 characters)
- `description` (Text, required)
- `status` (JobStatus enum)
- `before_image` (String, file path)
- `after_image` (String, file path)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### Many-to-Many Relationships
The Job model has many-to-many relationships with:

1. **Users** (`job_user_association` table)
   - Multiple users can be assigned to a job
   - A user can be assigned to multiple jobs

2. **Topics** (`job_topic_association` table)
   - A job can be related to multiple topics
   - A topic can be used in multiple jobs

3. **Rooms** (`job_room_association` table)
   - A job can be performed in multiple rooms
   - A room can have multiple jobs

4. **Properties** (`job_property_association` table)
   - A job can be related to multiple properties
   - A property can have multiple jobs

### JobStatus Enum
Available status values:
- `PENDING`
- `ASSIGNED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`
- `ON_HOLD`

## Files Modified/Created

### Models (`backend/my_app/models.py`)
- Added `JobStatus` enum
- Added `Job` model with all required fields
- Added association tables for many-to-many relationships:
  - `job_user_association`
  - `job_topic_association`
  - `job_room_association`
  - `job_property_association`
- Updated existing models to include reverse relationships

### Schemas (`backend/my_app/schemas.py`)
- Added `JobBase`, `JobCreate`, `JobUpdate`, and `Job` schemas
- Included support for relationship IDs in create/update operations

### CRUD Operations (`backend/my_app/crud.py`)
- Added `CRUDJob` class with specialized methods for many-to-many relationships
- Implemented methods:
  - `get_with_relationships()` - Get job with all related entities
  - `get_multi_with_relationships()` - Get multiple jobs with filtering
  - `create_with_relationships()` - Create job with relationships
  - `update_with_relationships()` - Update job and relationships
  - `get_by_status()` - Filter jobs by status
  - `get_by_user()` - Get jobs assigned to a user
- Added convenience functions for easy access

### API Routes (`backend/my_app/routers/jobs.py`)
- Complete REST API with endpoints:
  - `POST /jobs/` - Create new job
  - `GET /jobs/` - Get jobs with filtering and pagination
  - `GET /jobs/{job_id}` - Get specific job
  - `PUT /jobs/{job_id}` - Update job
  - `DELETE /jobs/{job_id}` - Delete job (admin only)
  - `GET /jobs/status/{status}` - Get jobs by status
  - `GET /jobs/user/{user_id}` - Get jobs by user
  - `GET /jobs/my-jobs/` - Get current user's jobs
  - `PATCH /jobs/{job_id}/status` - Update job status only

### Database Migration
- Created migration file: `2f3g4h5i6j7k_add_job_models_with_many_to_many_relationships.py`
- Includes creation of:
  - JobStatus enum type
  - Jobs table with all fields and indexes
  - All association tables for many-to-many relationships
  - Proper foreign key constraints and indexes

### Router Configuration (`backend/my_app/routers/__init__.py`)
- Added jobs router to main API router configuration

## API Usage Examples

### Create a Job
```json
POST /api/v1/jobs/
{
  "title": "Fix HVAC System",
  "description": "Repair the HVAC system in the main building",
  "status": "PENDING",
  "user_ids": [1, 2],
  "topic_ids": [1],
  "room_ids": [3, 4],
  "property_ids": [1],
  "before_image": "/uploads/before_hvac.jpg"
}
```

### Get Jobs with Filtering
```
GET /api/v1/jobs/?status=IN_PROGRESS&user_id=1&limit=50
```

### Update Job Status
```json
PATCH /api/v1/jobs/1/status
{
  "status": "COMPLETED"
}
```

## Key Features

1. **Many-to-Many Relationships**: Full support for complex relationships between jobs and users, topics, rooms, and properties.

2. **Comprehensive Filtering**: API supports filtering by status, user, topic, room, and property.

3. **Image Support**: Before and after image fields for visual documentation.

4. **Status Management**: Dedicated endpoint for status updates with proper enum validation.

5. **User Assignment**: Support for assigning multiple users to a single job.

6. **Proper Indexing**: Database indexes for optimal query performance.

7. **Error Handling**: Comprehensive error handling with appropriate HTTP status codes.

8. **Authentication**: All endpoints require authentication, with admin access for deletions.

## Next Steps

To use the new Job models:

1. Run the database migration to create the tables
2. Restart the FastAPI application to load the new routes
3. Use the API endpoints to create and manage jobs

The implementation provides a complete foundation for job management with flexible many-to-many relationships as requested.