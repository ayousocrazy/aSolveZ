from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import Province, District, Issue, Comment, Vote, Report

User = get_user_model()


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['is_moderator'] = user.is_moderator
        return token


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'bio']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            bio=validated_data.get('bio', ''),
        )
        return user


class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'bio', 'date_joined']


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'bio', 'is_moderator', 'date_joined']


class ProvinceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Province
        fields = ['id', 'name', 'number']


class DistrictSerializer(serializers.ModelSerializer):
    province_name = serializers.CharField(source='province.name', read_only=True)

    class Meta:
        model = District
        fields = ['id', 'name', 'province', 'province_name']


class IssueListSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True, default='[deleted]')
    province_name = serializers.CharField(source='province.name', read_only=True)
    district_name = serializers.CharField(source='district.name', read_only=True)
    vote_score = serializers.IntegerField(read_only=True)
    comment_count = serializers.IntegerField(read_only=True)
    user_vote = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            'id', 'title', 'category', 'province', 'province_name',
            'district', 'district_name', 'locality', 'author_username',
            'status', 'vote_score', 'comment_count', 'user_vote', 'created_at',
        ]

    def get_user_vote(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            vote = obj.votes.filter(user=request.user).first()
            return vote.value if vote else None
        return None


class IssueDetailSerializer(IssueListSerializer):
    class Meta(IssueListSerializer.Meta):
        fields = IssueListSerializer.Meta.fields + ['description', 'updated_at']


class IssueCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Issue
        fields = ['id', 'title', 'description', 'category', 'province', 'district', 'locality']

    def validate(self, data):
        if data['district'].province != data['province']:
            raise serializers.ValidationError("District does not belong to the selected province.")
        return data

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class IssueStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Issue
        fields = ['status']


class CommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True, default='[deleted]')

    class Meta:
        model = Comment
        fields = ['id', 'issue', 'author_username', 'text', 'created_at']
        read_only_fields = ['issue']


class CommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['id', 'text', 'created_at']

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        validated_data['issue'] = self.context['issue']
        return super().create(validated_data)


class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ['value']


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['id', 'reason', 'note']

    def create(self, validated_data):
        validated_data['reporter'] = self.context['request'].user
        target_type = self.context.get('target_type')
        target_id = self.context.get('target_id')
        if target_type == 'issue':
            validated_data['issue_id'] = target_id
        elif target_type == 'comment':
            validated_data['comment_id'] = target_id
        return super().create(validated_data)
