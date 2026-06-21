from django.db.models import Sum, Count, Q
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.shortcuts import get_object_or_404
from rest_framework.parsers import (
    MultiPartParser,
    FormParser,
)

from .models import Province, District, Municipality, Ward, Issue, Comment, Vote, Report, WardPost
from .serializers import (
    MyTokenObtainPairSerializer,
    RegisterSerializer, MeSerializer, MeUpdateSerializer,
    ProvinceSerializer, DistrictSerializer, MunicipalitySerializer, WardSerializer,
    IssueListSerializer, IssueDetailSerializer, IssueCreateSerializer, IssueStatusSerializer,
    CommentSerializer, CommentCreateSerializer,
    VoteSerializer, ReportSerializer,
    WardPostSerializer, WardAnalyticsSerializer,
)
from .permissions import (
    IsAuthorOrModerator, IsWardAccount,
    IsWardAccountForIssue, IsWardAccountForPost,
)



class MyTokenObtainPairView(TokenObtainPairView):
    """
    Single login endpoint for both citizens and ward accounts.
    POST { "phone": "...", "password": "..." }
    The JWT payload includes is_ward_account so the frontend can branch UI.
    """
    serializer_class = MyTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    """Citizen self-registration only. Ward accounts are pre-seeded."""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveAPIView):
    serializer_class = MeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class MeUpdateView(generics.UpdateAPIView):
    serializer_class = MeUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [
        MultiPartParser,
        FormParser,
    ]

    def get_object(self):
        return self.request.user



class ProvinceListView(generics.ListAPIView):
    serializer_class = ProvinceSerializer
    queryset = Province.objects.all()
    permission_classes = [permissions.AllowAny]


class DistrictListView(generics.ListAPIView):
    serializer_class = DistrictSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = District.objects.select_related('province')
        province_id = self.request.query_params.get('province')
        if province_id:
            qs = qs.filter(province_id=province_id)
        return qs


class MunicipalityListView(generics.ListAPIView):
    """
    GET /api/municipalities/
    Optional filters: ?district=<id>  ?province=<id>  ?type=<municipality|rural|…>
    """
    serializer_class = MunicipalitySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Municipality.objects.select_related('district__province')
        district_id = self.request.query_params.get('district')
        province_id = self.request.query_params.get('province')
        mtype = self.request.query_params.get('type')

        if district_id:
            qs = qs.filter(district_id=district_id)
        if province_id:
            qs = qs.filter(district__province_id=province_id)
        if mtype:
            qs = qs.filter(type=mtype)
        return qs


class WardListView(generics.ListAPIView):
    """
    GET /api/wards/
    Optional filters: ?municipality=<id>  ?district=<id>  ?province=<id>
    """
    serializer_class = WardSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Ward.objects.select_related('municipality__district__province')
        municipality_id = self.request.query_params.get('municipality')
        district_id = self.request.query_params.get('district')
        province_id = self.request.query_params.get('province')

        if municipality_id:
            qs = qs.filter(municipality_id=municipality_id)
        if district_id:
            qs = qs.filter(municipality__district_id=district_id)
        if province_id:
            qs = qs.filter(municipality__district__province_id=province_id)
        return qs


class IssueListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [
        MultiPartParser,
        FormParser,
    ]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return IssueCreateSerializer
        return IssueListSerializer

    def get_queryset(self):
        qs = Issue.objects.filter(is_deleted=False).select_related(
            'author', 'province', 'district', 'municipality', 'ward'
        ).prefetch_related('votes', 'comments')

        user = self.request.user

        # ----------------------------------------------------------------
        # WARD SCOPING — enforced server-side, not by query params.
        #
        # If the authenticated user has a ward assigned (citizen who picked
        # their ward on registration, or a ward account), scope the feed to
        # that ward only.  Unauthenticated visitors and users without a ward
        # see all issues and may still narrow by the filters below.
        # ----------------------------------------------------------------
        if user.is_authenticated and user.ward_id:
            qs = qs.filter(ward_id=user.ward_id)
        else:
            # Only allow manual ?ward= filter for users without a ward assigned
            ward = self.request.query_params.get('ward')
            if ward:
                qs = qs.filter(ward_id=ward)

        province = self.request.query_params.get('province')
        district = self.request.query_params.get('district')
        municipality = self.request.query_params.get('municipality')
        category = self.request.query_params.get('category')
        status_filter = self.request.query_params.get('status')
        sort = self.request.query_params.get('sort', 'new')

        if province:
            qs = qs.filter(province_id=province)
        if district:
            qs = qs.filter(district_id=district)
        if municipality:
            qs = qs.filter(municipality_id=municipality)
        if category:
            qs = qs.filter(category=category)
        if status_filter:
            qs = qs.filter(status=status_filter)

        if sort == 'top':
            qs = qs.annotate(score=Sum('votes__value')).order_by('-score', '-created_at')
        else:
            qs = qs.order_by('-created_at')

        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class IssueDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrModerator]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return IssueStatusSerializer
        return IssueDetailSerializer

    def get_queryset(self):
        return Issue.objects.filter(is_deleted=False).select_related(
            'author', 'province', 'district', 'municipality', 'ward'
        ).prefetch_related('votes', 'comments')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()


class WardIssueListView(generics.ListAPIView):
    """
    GET /api/ward/issues/
    Returns all non-deleted issues for the authenticated ward account's ward.
    Optional filters: ?category=  ?status=  ?sort=top|new
    """
    serializer_class = IssueDetailSerializer
    permission_classes = [IsWardAccount]

    def get_queryset(self):
        ward = self.request.user.ward
        qs = Issue.objects.filter(
            ward=ward, is_deleted=False
        ).select_related(
            'author', 'province', 'district', 'municipality', 'ward'
        ).prefetch_related('votes', 'comments', 'reports')

        category = self.request.query_params.get('category')
        status_filter = self.request.query_params.get('status')
        sort = self.request.query_params.get('sort', 'new')

        if category:
            qs = qs.filter(category=category)
        if status_filter:
            qs = qs.filter(status=status_filter)

        if sort == 'top':
            qs = qs.annotate(score=Sum('votes__value')).order_by('-score', '-created_at')
        else:
            qs = qs.order_by('-created_at')

        return qs


class WardIssueUpdateView(generics.UpdateAPIView):
    """
    PATCH /api/ward/issues/<pk>/
    Ward account updates the status of an issue and optionally adds
    resolution evidence when marking it completed.
    """
    serializer_class = IssueStatusSerializer
    permission_classes = [IsWardAccount, IsWardAccountForIssue]
    parser_classes = [
        MultiPartParser,
        FormParser,
    ]

    def get_queryset(self):
        return Issue.objects.filter(
            ward=self.request.user.ward, is_deleted=False
        )


class CommentListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_issue(self):
        return get_object_or_404(Issue, pk=self.kwargs['issue_pk'], is_deleted=False)

    def get_queryset(self):
        return Comment.objects.filter(
            issue_id=self.kwargs['issue_pk'], is_deleted=False
        ).select_related('author')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CommentCreateSerializer
        return CommentSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['issue'] = self.get_issue()
        return ctx


class CommentDestroyView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAuthorOrModerator]

    def get_queryset(self):
        return Comment.objects.filter(issue_id=self.kwargs['issue_pk'])

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()


class VoteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, issue_pk):
        issue = get_object_or_404(Issue, pk=issue_pk, is_deleted=False)
        serializer = VoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        value = serializer.validated_data['value']

        vote, created = Vote.objects.get_or_create(
            issue=issue, user=request.user,
            defaults={'value': value}
        )
        if not created:
            if vote.value == value:
                vote.delete()
                return Response({'detail': 'Vote removed.'}, status=status.HTTP_200_OK)
            else:
                vote.value = value
                vote.save()

        return Response(
            {'vote_score': issue.vote_score, 'user_vote': value},
            status=status.HTTP_200_OK
        )



class ReportView(generics.CreateAPIView):
    """
    POST /api/report/<target_type>/<target_id>/
    target_type: 'issue' | 'comment'
    For re-flagging a falsely completed issue, use reason='false_resolution'.
    """
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['target_type'] = self.kwargs.get('target_type')
        ctx['target_id'] = self.kwargs.get('target_id')
        return ctx

    def perform_create(self, serializer):
        target_type = self.kwargs.get('target_type')
        target_id = self.kwargs.get('target_id')
        if target_type == 'issue':
            get_object_or_404(Issue, pk=target_id)
            serializer.save(reporter=self.request.user, issue_id=target_id)
        elif target_type == 'comment':
            get_object_or_404(Comment, pk=target_id)
            serializer.save(reporter=self.request.user, comment_id=target_id)



class WardPostListView(generics.ListAPIView):
    """
    GET /api/ward-posts/?ward=<id>
    Public feed of a ward's announcements and project updates.
    """
    serializer_class = WardPostSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = WardPost.objects.select_related('ward__municipality__district__province')
        ward_id = self.request.query_params.get('ward')
        if ward_id:
            qs = qs.filter(ward_id=ward_id)
        return qs


class WardPostCreateView(generics.CreateAPIView):
    """
    POST /api/ward/posts/
    Ward accounts publish announcements and development updates.
    """
    serializer_class = WardPostSerializer
    permission_classes = [IsWardAccount]
    parser_classes = [
        MultiPartParser,
        FormParser,
    ]


class WardPostDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/ward/posts/<pk>/
    Ward accounts manage their own posts.
    """
    serializer_class = WardPostSerializer
    permission_classes = [IsWardAccount, IsWardAccountForPost]
    parser_classes = [
        MultiPartParser,
        FormParser,
    ]

    def get_queryset(self):
        return WardPost.objects.filter(ward=self.request.user.ward)



class WardAnalyticsView(APIView):
    """
    GET /api/ward/analytics/
    Returns performance metrics for the authenticated ward account's ward.
    """
    permission_classes = [IsWardAccount]

    def get(self, request):
        ward = request.user.ward
        issues = Issue.objects.filter(ward=ward, is_deleted=False)

        stats = issues.aggregate(
            total=Count('id'),
            pending=Count('id', filter=Q(status='pending')),
            acknowledged=Count('id', filter=Q(status='acknowledged')),
            completed=Count('id', filter=Q(status='completed')),
        )

        false_resolution_reports = Report.objects.filter(
            issue__ward=ward,
            reason='false_resolution',
            resolved=False,
        ).count()

        data = {
            'ward_id': ward.id,
            'ward_number': ward.number,
            'municipality': ward.municipality.name,
            'total_issues': stats['total'],
            'pending': stats['pending'],
            'acknowledged': stats['acknowledged'],
            'completed': stats['completed'],
            'false_resolution_reports': false_resolution_reports,
        }
        serializer = WardAnalyticsSerializer(data)
        return Response(serializer.data)


class MunicipalityRankingView(APIView):
    """
    GET /api/municipalities/<municipality_id>/ranking/
    Returns all wards in a municipality ranked by completion rate.
    Public endpoint — useful for the citizen leaderboard view.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, municipality_pk):
        municipality = get_object_or_404(Municipality, pk=municipality_pk)
        wards = Ward.objects.filter(municipality=municipality).annotate(
            total=Count('issues', filter=Q(issues__is_deleted=False)),
            completed=Count('issues', filter=Q(issues__is_deleted=False, issues__status='completed')),
            pending=Count('issues', filter=Q(issues__is_deleted=False, issues__status='pending')),
        )

        ranking = []
        for ward in wards:
            rate = (ward.completed / ward.total * 100) if ward.total > 0 else 0
            ranking.append({
                'ward_id': ward.id,
                'ward_number': ward.number,
                'total_issues': ward.total,
                'completed': ward.completed,
                'pending': ward.pending,
                'completion_rate': round(rate, 1),
            })

        ranking.sort(key=lambda x: (-x['completion_rate'], -x['completed']))
        return Response({
            'municipality': municipality.name,
            'wards': ranking,
        })