from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import (
    Province, District, Municipality, Ward,
    Issue, Comment, Vote, Report, WardPost,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the JWT payload with identity fields so the frontend
    can branch on citizen vs ward account without a round-trip.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['name'] = user.name
        token['is_moderator'] = user.is_moderator
        token['is_ward_account'] = user.is_ward_account
        if user.ward_id:
            token['ward_id'] = user.ward_id
        return token

class RegisterSerializer(serializers.ModelSerializer):
    """
    Citizen self-registration.
    Ward accounts are pre-seeded — citizens cannot register as ward staff.
    """
    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    profile_picture = serializers.ImageField(
        required=False,
        allow_null=True
    )

    ward = serializers.PrimaryKeyRelatedField(
        queryset=Ward.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = User
        fields = [
            'name',
            'phone',
            'email',
            'password',
            'profile_picture',
            'ward',          # ← added
        ]

    def validate_phone(self, value):
        return (
            value.strip()
            .replace(' ', '')
            .replace('-', '')
        )

    def create(self, validated_data):
        return User.objects.create_user(
            phone=validated_data['phone'],
            password=validated_data['password'],
            name=validated_data['name'],
            email=validated_data.get('email', ''),
            profile_picture=validated_data.get('profile_picture'),
            ward=validated_data.get('ward'),   # ← added
        )

class UserPublicSerializer(serializers.ModelSerializer):
    """Minimal public info shown on issues/comments."""
    class Meta:
        model = User
        fields = ['id', 'name', 'profile_picture']


class MeSerializer(serializers.ModelSerializer):
    """Full profile for the authenticated user (/auth/me/)."""
    ward_display = serializers.SerializerMethodField()
    is_ward_account = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'name', 'phone', 'email',
            'profile_picture', 'is_moderator', 'is_ward_account',
            'date_joined', 'ward', 'ward_display',
        ]
        read_only_fields = ['phone', 'is_moderator', 'is_ward_account', 'date_joined']

    def get_ward_display(self, obj):
        if obj.ward:
            return {
                "id": obj.ward.id,
                "number": obj.ward.number,

                "municipality_id": obj.ward.municipality.id,
                "municipality": obj.ward.municipality.name,

                "district_id": obj.ward.municipality.district.id,
                "district": obj.ward.municipality.district.name,

                "province_id": obj.ward.municipality.district.province.id,
                "province": obj.ward.municipality.district.province.name,
            }
        return None


class MeUpdateSerializer(serializers.ModelSerializer):
    """Citizens may update name, email and profile picture."""
    class Meta:
        model = User
        fields = ['name', 'email', 'profile_picture']

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
    author_name = serializers.CharField(
        source='author.name', read_only=True, default='[deleted]'
    )
    author_profile_picture = serializers.ImageField(
        source='author.profile_picture', read_only=True
    )
    province_name = serializers.CharField(source='province.name', read_only=True)
    district_name = serializers.CharField(source='district.name', read_only=True)
    municipality_name = serializers.CharField(
        source='municipality.name', read_only=True, default=None
    )
    ward_number = serializers.IntegerField(
        source='ward.number', read_only=True, default=None
    )
    vote_score = serializers.IntegerField(read_only=True)
    comment_count = serializers.IntegerField(read_only=True)
    user_vote = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            'id', 'category',
            'province', 'province_name',
            'district', 'district_name',
            'municipality', 'municipality_name',
            'ward', 'ward_number',
            'locality',
            'author_name', 'author_profile_picture',
            'status', 'vote_score', 'comment_count', 'user_vote',
            'image',
            'created_at',
        ]

    def get_user_vote(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            vote = obj.votes.filter(user=request.user).first()
            return vote.value if vote else None
        return None


class IssueDetailSerializer(IssueListSerializer):
    class Meta(IssueListSerializer.Meta):
        fields = IssueListSerializer.Meta.fields + [
            'description', 'video',
            'resolution_note', 'resolution_image', 'resolution_video',
            'updated_at',
        ]


class IssueCreateSerializer(serializers.ModelSerializer):
    """Used by citizens to submit a new complaint."""

    class Meta:
        model = Issue
        fields = [
            'id', 'description', 'category',
            'province', 'district', 'municipality', 'ward',
            'locality', 'image', 'video',
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
    """
    Used by ward accounts to update status (acknowledge → completed).
    When marking completed, resolution evidence is required.
    """
    class Meta:
        model = Issue
        fields = [
            'status',
            'resolution_note', 'resolution_image', 'resolution_video',
        ]

    def validate(self, data):
        status = data.get('status', self.instance.status if self.instance else None)
        if status == 'completed':
            # At least a resolution note or image is required
            note = data.get('resolution_note', '')
            image = data.get('resolution_image', None)
            if not note and not image:
                raise serializers.ValidationError(
                    "Provide a resolution note or image when marking an issue as completed."
                )
        return data


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(
        source='author.name', read_only=True, default='[deleted]'
    )
    author_profile_picture = serializers.ImageField(
        source='author.profile_picture', read_only=True
    )

    class Meta:
        model = Comment
        fields = ['id', 'issue', 'author_name', 'author_profile_picture', 'text', 'created_at']
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
# Votes
# ---------------------------------------------------------------------------

class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ['value']


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['id', 'reason', 'note']

    def validate_reason(self, value):
        context = self.context
        target_type = context.get('target_type')
        if value == 'false_resolution' and target_type != 'issue':
            raise serializers.ValidationError(
                "false_resolution can only be used when reporting an issue."
            )
        return value

    def create(self, validated_data):
        validated_data['reporter'] = self.context['request'].user
        target_type = self.context.get('target_type')
        target_id = self.context.get('target_id')
        if target_type == 'issue':
            validated_data['issue_id'] = target_id
        elif target_type == 'comment':
            validated_data['comment_id'] = target_id
        return super().create(validated_data)


# ---------------------------------------------------------------------------
# Ward Posts (announcements, projects, events)
# ---------------------------------------------------------------------------

class WardPostSerializer(serializers.ModelSerializer):
    ward_number = serializers.IntegerField(source='ward.number', read_only=True)
    municipality_name = serializers.CharField(
        source='ward.municipality.name', read_only=True
    )
    post_type_display = serializers.CharField(source='get_post_type_display', read_only=True)

    class Meta:
        model = WardPost
        fields = [
            'id', 'ward', 'ward_number', 'municipality_name',
            'post_type', 'post_type_display',
            'title', 'body', 'image', 'video',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['ward']

    def create(self, validated_data):
        # Ward is inferred from the authenticated ward account
        validated_data['ward'] = self.context['request'].user.ward
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


# ---------------------------------------------------------------------------
# Ward analytics (for the ward dashboard)
# ---------------------------------------------------------------------------

class WardAnalyticsSerializer(serializers.Serializer):
    ward_id = serializers.IntegerField()
    ward_number = serializers.IntegerField()
    municipality = serializers.CharField()
    total_issues = serializers.IntegerField()
    pending = serializers.IntegerField()
    acknowledged = serializers.IntegerField()
    completed = serializers.IntegerField()
    false_resolution_reports = serializers.IntegerField()