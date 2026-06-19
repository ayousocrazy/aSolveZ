from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import Province, District, Municipality, Ward, Issue, Comment, Vote, Report

User = get_user_model()


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['is_moderator'] = user.is_moderator
        if user.ward_id:
            token['ward_id'] = user.ward_id
        return token


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    # Accept ward PK; ward implicitly carries municipality → district → province
    ward = serializers.PrimaryKeyRelatedField(
        queryset=Ward.objects.select_related('municipality__district__province'),
        required=True,
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'bio', 'ward']

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            bio=validated_data.get('bio', ''),
            ward=validated_data.get('ward'),
        )


class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'bio', 'date_joined']


class MeSerializer(serializers.ModelSerializer):
    ward_display = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'bio', 'is_moderator', 'date_joined', 'ward', 'ward_display']

    def get_ward_display(self, obj):
        if obj.ward:
            return {
                'id': obj.ward.id,
                'number': obj.ward.number,
                'municipality': obj.ward.municipality.name,
                'district': obj.ward.municipality.district.name,
                'province': obj.ward.municipality.district.province.name,
            }
        return None


# ---------------------------------------------------------------------------
# Geography
# ---------------------------------------------------------------------------

class ProvinceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Province
        fields = ['id', 'name', 'number']


class DistrictSerializer(serializers.ModelSerializer):
    province_name = serializers.CharField(source='province.name', read_only=True)

    class Meta:
        model = District
        fields = ['id', 'name', 'province', 'province_name']


class MunicipalitySerializer(serializers.ModelSerializer):
    district_name = serializers.CharField(source='district.name', read_only=True)
    province_name = serializers.CharField(source='district.province.name', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Municipality
        fields = [
            'id', 'name', 'type', 'type_display',
            'district', 'district_name', 'province_name',
            'ward_count',
        ]


class WardSerializer(serializers.ModelSerializer):
    municipality_name = serializers.CharField(source='municipality.name', read_only=True)
    municipality_type = serializers.CharField(source='municipality.get_type_display', read_only=True)
    district_name = serializers.CharField(source='municipality.district.name', read_only=True)
    province_name = serializers.CharField(source='municipality.district.province.name', read_only=True)

    class Meta:
        model = Ward
        fields = [
            'id', 'number',
            'municipality', 'municipality_name', 'municipality_type',
            'district_name', 'province_name',
        ]


# ---------------------------------------------------------------------------
# Issues
# ---------------------------------------------------------------------------

class IssueListSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(
        source='author.username', read_only=True, default='[deleted]'
    )
    province_name = serializers.CharField(source='province.name', read_only=True)
    district_name = serializers.CharField(source='district.name', read_only=True)
    municipality_name = serializers.CharField(source='municipality.name', read_only=True, default=None)
    ward_number = serializers.IntegerField(source='ward.number', read_only=True, default=None)
    vote_score = serializers.IntegerField(read_only=True)
    comment_count = serializers.IntegerField(read_only=True)
    user_vote = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            'id', 'title', 'category',
            'province', 'province_name',
            'district', 'district_name',
            'municipality', 'municipality_name',
            'ward', 'ward_number',
            'locality', 'author_username',
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
        fields = [
            'id', 'title', 'description', 'category',
            'province', 'district', 'municipality', 'ward', 'locality',
        ]

    def validate(self, data):
        district = data.get('district')
        province = data.get('province')
        municipality = data.get('municipality')
        ward = data.get('ward')

        if district and province and district.province != province:
            raise serializers.ValidationError(
                "District does not belong to the selected province."
            )
        if municipality and district and municipality.district != district:
            raise serializers.ValidationError(
                "Municipality does not belong to the selected district."
            )
        if ward and municipality and ward.municipality != municipality:
            raise serializers.ValidationError(
                "Ward does not belong to the selected municipality."
            )
        return data

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class IssueStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Issue
        fields = ['status']


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

class CommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(
        source='author.username', read_only=True, default='[deleted]'
    )

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


# ---------------------------------------------------------------------------
# Votes & Reports
# ---------------------------------------------------------------------------

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