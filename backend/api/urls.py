from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    MyTokenObtainPairView,
    RegisterView, MeView, MeUpdateView,
    ProvinceListView, DistrictListView, MunicipalityListView, WardListView,
    IssueListCreateView, IssueDetailView,
    WardIssueListView, WardIssueUpdateView,
    CommentListCreateView, CommentDestroyView,
    VoteView, ReportView,
    WardPostListView, WardPostCreateView, WardPostDetailView,
    WardAnalyticsView, MunicipalityRankingView,
)

urlpatterns = [

    path('auth/login/',    MyTokenObtainPairView.as_view(), name='token-obtain'),
    path('auth/refresh/',  TokenRefreshView.as_view(),      name='token-refresh'),
    path('auth/register/', RegisterView.as_view(),          name='register'),
    path('auth/me/',       MeView.as_view(),                name='me'),
    path('auth/me/update/', MeUpdateView.as_view(),         name='me-update'),

    path('provinces/',     ProvinceListView.as_view(),     name='province-list'),
    path('districts/',     DistrictListView.as_view(),     name='district-list'),
    path('municipalities/', MunicipalityListView.as_view(), name='municipality-list'),
    path('wards/',         WardListView.as_view(),         name='ward-list'),

    path('issues/',        IssueListCreateView.as_view(),  name='issue-list-create'),
    path('issues/<int:pk>/', IssueDetailView.as_view(),   name='issue-detail'),

    path('ward/issues/',               WardIssueListView.as_view(),   name='ward-issue-list'),
    path('ward/issues/<int:pk>/',      WardIssueUpdateView.as_view(), name='ward-issue-update'),
    path('ward/posts/',                WardPostCreateView.as_view(),  name='ward-post-create'),
    path('ward/posts/<int:pk>/',       WardPostDetailView.as_view(),  name='ward-post-detail'),
    path('ward/analytics/',            WardAnalyticsView.as_view(),   name='ward-analytics'),

    path('ward-posts/',    WardPostListView.as_view(),     name='ward-post-list'),
    path('municipalities/<int:municipality_pk>/ranking/',
         MunicipalityRankingView.as_view(), name='municipality-ranking'),

    path('issues/<int:issue_pk>/comments/',
         CommentListCreateView.as_view(), name='comment-list-create'),
    path('issues/<int:issue_pk>/comments/<int:pk>/',
         CommentDestroyView.as_view(),   name='comment-destroy'),

    path('issues/<int:issue_pk>/vote/', VoteView.as_view(), name='vote'),

    path('report/<str:target_type>/<int:target_id>/',
         ReportView.as_view(), name='report'),
]