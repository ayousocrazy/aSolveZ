from django.urls import path
from .views import (
    RegisterView, me_view,
    ProvinceListView, DistrictListView,
    IssueListCreateView, IssueDetailView,
    CommentListCreateView, CommentDestroyView,
    VoteView, ReportView,
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/me/', me_view, name='me'),

    path('provinces/', ProvinceListView.as_view(), name='province-list'),
    path('districts/', DistrictListView.as_view(), name='district-list'),

    path('issues/', IssueListCreateView.as_view(), name='issue-list-create'),
    path('issues/<int:pk>/', IssueDetailView.as_view(), name='issue-detail'),
    path('issues/<int:issue_pk>/comments/', CommentListCreateView.as_view(), name='comment-list-create'),
    path('issues/<int:issue_pk>/comments/<int:pk>/', CommentDestroyView.as_view(), name='comment-destroy'),
    path('issues/<int:issue_pk>/vote/', VoteView.as_view(), name='vote'),

    path('report/<str:target_type>/<int:target_id>/', ReportView.as_view(), name='report'),
]
