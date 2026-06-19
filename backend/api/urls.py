from django.urls import path
from .views import (
    RegisterView, me_view,
    ProvinceListView, DistrictListView, MunicipalityListView, WardListView,
    IssueListCreateView, IssueDetailView,
    CommentListCreateView, CommentDestroyView,
    VoteView, ReportView,
)

urlpatterns = [
    # Auth
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/me/', me_view, name='me'),

    # Geography — cascading lookup chain for registration / complaint forms
    # provinces → districts?province=<id> → municipalities?district=<id> → wards?municipality=<id>
    path('provinces/', ProvinceListView.as_view(), name='province-list'),
    path('districts/', DistrictListView.as_view(), name='district-list'),
    path('municipalities/', MunicipalityListView.as_view(), name='municipality-list'),
    path('wards/', WardListView.as_view(), name='ward-list'),

    # Issues
    path('issues/', IssueListCreateView.as_view(), name='issue-list-create'),
    path('issues/<int:pk>/', IssueDetailView.as_view(), name='issue-detail'),

    # Comments
    path('issues/<int:issue_pk>/comments/', CommentListCreateView.as_view(), name='comment-list-create'),
    path('issues/<int:issue_pk>/comments/<int:pk>/', CommentDestroyView.as_view(), name='comment-destroy'),

    # Votes
    path('issues/<int:issue_pk>/vote/', VoteView.as_view(), name='vote'),

    # Reports
    path('report/<str:target_type>/<int:target_id>/', ReportView.as_view(), name='report'),
]