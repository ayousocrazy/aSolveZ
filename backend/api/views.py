from django.db.models import Sum, Q
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.shortcuts import get_object_or_404

from .models import Province, District, Issue, Comment, Vote, Report
from .serializers import (
    MyTokenObtainPairSerializer, RegisterSerializer, MeSerializer,
    ProvinceSerializer, DistrictSerializer,
    IssueListSerializer, IssueDetailSerializer, IssueCreateSerializer, IssueStatusSerializer,
    CommentSerializer, CommentCreateSerializer,
    VoteSerializer, ReportSerializer,
)
from .permissions import IsAuthorOrModerator


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = MeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer(self, *args, **kwargs):
        # Only allow bio updates from this endpoint
        kwargs['fields'] = ['bio']
        return super().get_serializer(*args, **kwargs)


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


class IssueListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return IssueCreateSerializer
        return IssueListSerializer

    def get_queryset(self):
        qs = Issue.objects.filter(is_deleted=False).select_related(
            'author', 'province', 'district'
        ).prefetch_related('votes', 'comments')

        province = self.request.query_params.get('province')
        district = self.request.query_params.get('district')
        category = self.request.query_params.get('category')
        sort = self.request.query_params.get('sort', 'new')

        if province:
            qs = qs.filter(province_id=province)
        if district:
            qs = qs.filter(district_id=district)
        if category:
            qs = qs.filter(category=category)

        if sort == 'top':
            qs = qs.annotate(score=Sum('votes__value')).order_by('-score', '-created_at')
        else:
            qs = qs.order_by('-created_at')

        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class IssueDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrModerator]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return IssueStatusSerializer
        return IssueDetailSerializer

    def get_queryset(self):
        return Issue.objects.filter(is_deleted=False).select_related(
            'author', 'province', 'district'
        ).prefetch_related('votes', 'comments')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def perform_destroy(self, instance):
        # Soft delete
        instance.is_deleted = True
        instance.save()


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
                # Toggle off (remove vote)
                vote.delete()
                return Response({'detail': 'Vote removed.'}, status=status.HTTP_200_OK)
            else:
                vote.value = value
                vote.save()

        score = issue.vote_score
        return Response({'vote_score': score, 'user_vote': value}, status=status.HTTP_200_OK)


class ReportView(generics.CreateAPIView):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['target_type'] = self.kwargs.get('target_type')  # 'issue' or 'comment'
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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    from .serializers import MeSerializer
    return Response(MeSerializer(request.user).data)
