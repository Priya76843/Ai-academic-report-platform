from fastapi import APIRouter

from app.api.v1 import auth, health, jobs, projects

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(jobs.router)
api_router.include_router(projects.router)

# B-05 assets, B-06 sources, B-14 plan/sections, B-16/B-17 generate/review, B-18 exports, B-19 usage
