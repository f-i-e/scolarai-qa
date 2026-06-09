import { apiRoutePrefix } from "./paths";

/**
 * @see tests/backend/fixtures/openapi-spec.json (api.testing)
 */
export const healthRoutes = {
  root: "/v1",
  metrics: "/v1/metrics",
  status: `${apiRoutePrefix}/status`,
} as const;

/** Routes under `SCHOLARAI_API_VERSION_PREFIX` (default `/v1`). */
export const apiRoutes = {
  // Admin
  adminAuthSessions: `${apiRoutePrefix}/admin/auth/sessions`,
  adminAuthForceLogout: `${apiRoutePrefix}/admin/auth/force-logout`,
  adminAssessments: `${apiRoutePrefix}/admin/assessments`,
  adminAssessmentRestore: (id: string) =>
    `${apiRoutePrefix}/admin/assessments/${encodeURIComponent(id)}/restore`,
  adminSubmissions: `${apiRoutePrefix}/admin/submissions`,
  adminBillingRevenue: `${apiRoutePrefix}/admin/billing/revenue`,
  adminBillingExamPacks: `${apiRoutePrefix}/admin/billing/exam-packs`,
  adminBillingExamPackById: (id: string) =>
    `${apiRoutePrefix}/admin/billing/exam-packs/${encodeURIComponent(id)}`,
  adminBillingExamPackRetire: (id: string) =>
    `${apiRoutePrefix}/admin/billing/exam-packs/${encodeURIComponent(id)}/retire`,
  adminBillingPlanPrice: (planId: string) =>
    `${apiRoutePrefix}/admin/billing/plans/${encodeURIComponent(planId)}/price`,
  adminNotificationsBroadcast: `${apiRoutePrefix}/admin/notifications/broadcast`,
  adminNotificationsStats: `${apiRoutePrefix}/admin/notifications/stats`,

  // Analytics
  analyticsLearnerOverview: (learnerId: string) =>
    `${apiRoutePrefix}/analytics/learners/${encodeURIComponent(learnerId)}/overview`,
  analyticsLearnerPerformance: (learnerId: string) =>
    `${apiRoutePrefix}/analytics/learners/${encodeURIComponent(learnerId)}/performance`,
  analyticsLearnerActivity: (learnerId: string) =>
    `${apiRoutePrefix}/analytics/learners/${encodeURIComponent(learnerId)}/activity`,
  analyticsLearnerCompletionRate: (learnerId: string) =>
    `${apiRoutePrefix}/analytics/learners/${encodeURIComponent(learnerId)}/completion-rate`,
  analyticsLearnerStudyTime: (learnerId: string) =>
    `${apiRoutePrefix}/analytics/learners/${encodeURIComponent(learnerId)}/study-time`,
  analyticsSchoolDashboard: (schoolId: string) =>
    `${apiRoutePrefix}/analytics/schools/${encodeURIComponent(schoolId)}/dashboard`,
  analyticsSchoolRankings: (schoolId: string) =>
    `${apiRoutePrefix}/analytics/schools/${encodeURIComponent(schoolId)}/rankings`,
  analyticsSchoolGrades: (schoolId: string) =>
    `${apiRoutePrefix}/analytics/schools/${encodeURIComponent(schoolId)}/grades`,
  analyticsSchoolCurricula: (schoolId: string) =>
    `${apiRoutePrefix}/analytics/schools/${encodeURIComponent(schoolId)}/curricula`,
  analyticsCurriculumCompletion: (curriculumId: string) =>
    `${apiRoutePrefix}/analytics/curricula/${encodeURIComponent(curriculumId)}/completion`,
  analyticsCurriculumSubjects: (curriculumId: string) =>
    `${apiRoutePrefix}/analytics/curricula/${encodeURIComponent(curriculumId)}/subjects`,
  analyticsSubjectPerformance: (subjectId: string) =>
    `${apiRoutePrefix}/analytics/subjects/${encodeURIComponent(subjectId)}/performance`,

  // Users
  users: `${apiRoutePrefix}/users`,
  userById: (id: string) => `${apiRoutePrefix}/users/${encodeURIComponent(id)}`,
  userSuspend: (id: string) =>
    `${apiRoutePrefix}/users/${encodeURIComponent(id)}/suspend`,
  userAccountDelete: `${apiRoutePrefix}/users/account`,
  userOnboarding: `${apiRoutePrefix}/users/onboarding`,
  userOnboardingExam: `${apiRoutePrefix}/users/onboarding/exam`,
  userOnboardingRandom: `${apiRoutePrefix}/users/onboarding/random`,
  userProfileCreate: `${apiRoutePrefix}/users/profile`,
  userProfileAvatarPresign: `${apiRoutePrefix}/users/profile/avatar/presign`,
  userProfileMe: `${apiRoutePrefix}/users/profile/me`,
  userProfileUpdate: `${apiRoutePrefix}/users/profile/update`,
  userProfileSearch: `${apiRoutePrefix}/users/profile/search`,
  userInterests: `${apiRoutePrefix}/users/interests`,
  learnerProfiles: `${apiRoutePrefix}/users/learner-profiles`,
  learnerProfilesMe: `${apiRoutePrefix}/users/learner-profiles/me`,
  learnerProfileById: (id: string) =>
    `${apiRoutePrefix}/users/learner-profiles/${encodeURIComponent(id)}`,
  learnerProfileCurricula: (id: string) =>
    `${apiRoutePrefix}/users/learner-profiles/${encodeURIComponent(id)}/curricula`,
  learnerProfileCurriculumDelete: (id: string, curriculumId: string) =>
    `${apiRoutePrefix}/users/learner-profiles/${encodeURIComponent(id)}/curricula/${encodeURIComponent(curriculumId)}`,
  learnerCountriesList: `${apiRoutePrefix}/users/learner-profiles/countries/list`,
  learnerStatesByCountry: (countryId: string) =>
    `${apiRoutePrefix}/users/learner-profiles/countries/${encodeURIComponent(countryId)}/states`,
  learnerSchoolsByState: (stateId: string) =>
    `${apiRoutePrefix}/users/learner-profiles/states/${encodeURIComponent(stateId)}/schools`,
  usersCountries: `${apiRoutePrefix}/users/countries`,
  usersCountryById: (countryId: string) =>
    `${apiRoutePrefix}/users/countries/${encodeURIComponent(countryId)}`,
  usersStates: `${apiRoutePrefix}/users/states`,
  usersStateById: (stateId: string) =>
    `${apiRoutePrefix}/users/states/${encodeURIComponent(stateId)}`,
  usersSchools: `${apiRoutePrefix}/users/schools`,
  usersSchoolById: (schoolId: string) =>
    `${apiRoutePrefix}/users/schools/${encodeURIComponent(schoolId)}`,
  usersLocationsSearch: `${apiRoutePrefix}/users/locations/search`,

  // Lessons
  lessons:
    process.env.SCHOLARAI_LESSONS_PATH?.replace(/\/$/, "") ??
    `${apiRoutePrefix}/lessons`,
  lessonBySlug: (slug: string) => {
    const root =
      process.env.SCHOLARAI_LESSONS_PATH?.replace(/\/$/, "") ??
      `${apiRoutePrefix}/lessons`;
    if (process.env.SCHOLARAI_LESSON_SLUG_STYLE === "flat") {
      return `${root}/${encodeURIComponent(slug)}`;
    }
    return `${root}/slug/${encodeURIComponent(slug)}`;
  },
  lessonById: (id: string) => {
    const root =
      process.env.SCHOLARAI_LESSONS_PATH?.replace(/\/$/, "") ??
      `${apiRoutePrefix}/lessons`;
    return `${root}/${encodeURIComponent(id)}`;
  },
  lessonProgress: (id: string) => {
    const root =
      process.env.SCHOLARAI_LESSONS_PATH?.replace(/\/$/, "") ??
      `${apiRoutePrefix}/lessons`;
    return `${root}/${encodeURIComponent(id)}/progress`;
  },
  lessonStart: (id: string) => {
    const root =
      process.env.SCHOLARAI_LESSONS_PATH?.replace(/\/$/, "") ??
      `${apiRoutePrefix}/lessons`;
    return `${root}/${encodeURIComponent(id)}/start`;
  },
  lessonComplete: (id: string) => {
    const root =
      process.env.SCHOLARAI_LESSONS_PATH?.replace(/\/$/, "") ??
      `${apiRoutePrefix}/lessons`;
    return `${root}/${encodeURIComponent(id)}/complete`;
  },
  lessonChapters: (id: string) => {
    const root =
      process.env.SCHOLARAI_LESSONS_PATH?.replace(/\/$/, "") ??
      `${apiRoutePrefix}/lessons`;
    return `${root}/${encodeURIComponent(id)}/chapters`;
  },

  // Assessments
  assessments: `${apiRoutePrefix}/assessments`,
  assessmentsByLesson: (lessonId: string) =>
    `${apiRoutePrefix}/assessments/lesson/${encodeURIComponent(lessonId)}`,
  assessmentsBySubject: (subjectId: string) =>
    `${apiRoutePrefix}/assessments/subject/${encodeURIComponent(subjectId)}`,
  assessmentById: (id: string) =>
    `${apiRoutePrefix}/assessments/${encodeURIComponent(id)}`,
  assessmentPublish: (id: string) =>
    `${apiRoutePrefix}/assessments/${encodeURIComponent(id)}/publish`,
  assessmentUnpublish: (id: string) =>
    `${apiRoutePrefix}/assessments/${encodeURIComponent(id)}/unpublish`,
  assessmentSubmit: (id: string) =>
    `${apiRoutePrefix}/assessments/${encodeURIComponent(id)}/submit`,
  assessmentSave: (id: string) =>
    `${apiRoutePrefix}/assessments/${encodeURIComponent(id)}/save`,
  assessmentSubmissions: (id: string) =>
    `${apiRoutePrefix}/assessments/${encodeURIComponent(id)}/submissions`,
  assessmentSubmissionResult: (id: string, submissionId: string) =>
    `${apiRoutePrefix}/assessments/${encodeURIComponent(id)}/submissions/${encodeURIComponent(submissionId)}/result`,
  assessmentSubmissionConfidence: (id: string, submissionId: string) =>
    `${apiRoutePrefix}/assessments/${encodeURIComponent(id)}/submissions/${encodeURIComponent(submissionId)}/confidence`,
  assessmentQuestionHint: (id: string, questionId: string) =>
    `${apiRoutePrefix}/assessments/${encodeURIComponent(id)}/questions/${encodeURIComponent(questionId)}/hint`,
  assessmentsHistory: `${apiRoutePrefix}/assessments/history`,

  // Billing
  billingPlans: `${apiRoutePrefix}/billing/plans`,
  billingEntitlements: `${apiRoutePrefix}/billing/entitlements`,
  billingSubscription: `${apiRoutePrefix}/billing/subscription`,
  billingSubscribe: `${apiRoutePrefix}/billing/subscribe`,
  billingPurchaseExamPack: `${apiRoutePrefix}/billing/purchase/exam-pack`,
  billingSubscriptionCancel: `${apiRoutePrefix}/billing/subscription/cancel`,

  // Curriculum
  curriculumCurricula: `${apiRoutePrefix}/curriculum/curricula`,
  curriculumById: (id: string) =>
    `${apiRoutePrefix}/curriculum/curricula/${encodeURIComponent(id)}`,
  curriculumStructure: (id: string) =>
    `${apiRoutePrefix}/curriculum/curricula/${encodeURIComponent(id)}/structure`,
  curriculumGrades: (id: string) =>
    `${apiRoutePrefix}/curriculum/curricula/${encodeURIComponent(id)}/grades`,
  curriculumByCode: (code: string) =>
    `${apiRoutePrefix}/curriculum/curricula/code/${encodeURIComponent(code)}`,
  curriculumSchoolCurricula: (schoolId: string) =>
    `${apiRoutePrefix}/curriculum/schools/${encodeURIComponent(schoolId)}/curricula`,

  // Progress
  progressSummary: `${apiRoutePrefix}/progress/summary`,
  progressSubjects: `${apiRoutePrefix}/progress/subjects`,
  progressSubjectById: (curriculumGradeSubjectId: string) =>
    `${apiRoutePrefix}/progress/subjects/${encodeURIComponent(curriculumGradeSubjectId)}`,
  progressConfidence: `${apiRoutePrefix}/progress/confidence`,
  progressSkillMastery: `${apiRoutePrefix}/progress/skill-mastery`,
  progressFocusAreas: `${apiRoutePrefix}/progress/focus-areas`,
  progressLearningPath: `${apiRoutePrefix}/progress/learning-path`,
  progressLesson: (lessonId: string) =>
    `${apiRoutePrefix}/progress/lessons/${encodeURIComponent(lessonId)}`,
  progressLessonStart: (lessonId: string) =>
    `${apiRoutePrefix}/progress/lessons/${encodeURIComponent(lessonId)}/start`,
  progressCurriculum: (curriculumId: string) =>
    `${apiRoutePrefix}/progress/curriculum/${encodeURIComponent(curriculumId)}`,
  progressUserSummary: (userId: string) =>
    `${apiRoutePrefix}/progress/users/${encodeURIComponent(userId)}/summary`,
  progressReport: (userId: string) =>
    `${apiRoutePrefix}/progress/reports/${encodeURIComponent(userId)}`,

  // Notifications
  notifications: `${apiRoutePrefix}/notifications`,
  notificationsReadAll: `${apiRoutePrefix}/notifications/read-all`,
  notificationById: (id: string) =>
    `${apiRoutePrefix}/notifications/${encodeURIComponent(id)}`,
  notificationRead: (id: string) =>
    `${apiRoutePrefix}/notifications/${encodeURIComponent(id)}/read`,
  notificationsFcm: `${apiRoutePrefix}/notifications/devices/fcm`,

  // Exam hub
  examHubPacks: `${apiRoutePrefix}/exam-hub/packs`,
  examHubPackById: (packId: string) =>
    `${apiRoutePrefix}/exam-hub/packs/${encodeURIComponent(packId)}`,
  examHubPackSubjects: (packId: string) =>
    `${apiRoutePrefix}/exam-hub/packs/${encodeURIComponent(packId)}/subjects`,
  examHubPackSessions: (packId: string) =>
    `${apiRoutePrefix}/exam-hub/packs/${encodeURIComponent(packId)}/sessions`,
  examHubAdminPacks: `${apiRoutePrefix}/exam-hub/admin/packs`,
  examHubSessionById: (sessionId: string) =>
    `${apiRoutePrefix}/exam-hub/sessions/${encodeURIComponent(sessionId)}`,
  examHubSessionBegin: (sessionId: string) =>
    `${apiRoutePrefix}/exam-hub/sessions/${encodeURIComponent(sessionId)}/begin`,
  examHubSessionPause: (sessionId: string) =>
    `${apiRoutePrefix}/exam-hub/sessions/${encodeURIComponent(sessionId)}/pause`,
  examHubSessionResume: (sessionId: string) =>
    `${apiRoutePrefix}/exam-hub/sessions/${encodeURIComponent(sessionId)}/resume`,
  examHubSessionSubmit: (sessionId: string) =>
    `${apiRoutePrefix}/exam-hub/sessions/${encodeURIComponent(sessionId)}/submit`,
  examHubSessionResults: (sessionId: string) =>
    `${apiRoutePrefix}/exam-hub/sessions/${encodeURIComponent(sessionId)}/results`,
  examHubSessionQuestions: (sessionId: string) =>
    `${apiRoutePrefix}/exam-hub/sessions/${encodeURIComponent(sessionId)}/questions`,
  examHubSessionAnswer: (sessionId: string, questionId: string) =>
    `${apiRoutePrefix}/exam-hub/sessions/${encodeURIComponent(sessionId)}/questions/${encodeURIComponent(questionId)}/answer`,
  examHubSessionMarkReview: (sessionId: string, questionId: string) =>
    `${apiRoutePrefix}/exam-hub/sessions/${encodeURIComponent(sessionId)}/questions/${encodeURIComponent(questionId)}/mark-review`,
  examHubSessionHint: (sessionId: string, questionId: string) =>
    `${apiRoutePrefix}/exam-hub/sessions/${encodeURIComponent(sessionId)}/questions/${encodeURIComponent(questionId)}/hint`,
  examHubProgress: `${apiRoutePrefix}/exam-hub/progress`,

  // Test dashboard
  testDashboard: `${apiRoutePrefix}/test-dashboard`,
  testDashboardFavicon: `${apiRoutePrefix}/test-dashboard/favicon.svg`,
  testDashboardAsset: (path: string) =>
    `${apiRoutePrefix}/test-dashboard/assets/${path}`,
  testDashboardLogs: `${apiRoutePrefix}/test-dashboard/logs`,
  testDashboardErrors: `${apiRoutePrefix}/test-dashboard/errors`,
  testDashboardErrorById: (id: string) =>
    `${apiRoutePrefix}/test-dashboard/errors/${encodeURIComponent(id)}`,

  // Roles
  roles: `${apiRoutePrefix}/roles`,
  roleById: (id: string) => `${apiRoutePrefix}/roles/${encodeURIComponent(id)}`,
  rolesAssign: `${apiRoutePrefix}/roles/assign`,
  rolesRevoke: `${apiRoutePrefix}/roles/revoke`,
  userRolePermissions: (userId: string) =>
    `${apiRoutePrefix}/roles/user/${encodeURIComponent(userId)}/permissions`,
} as const;
