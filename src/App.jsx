import { Routes, Route, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import GoverningBody from './pages/GoverningBody'
import AboutUs from './pages/AboutUs'
import SecretaryMessage from './pages/SecretaryMessage'
import Membership from './pages/Membership'
import AcademicsEvents from './pages/AcademicsEvents'
import Publications from './pages/Publications'
import ContactUs from './pages/ContactUs'
// import Admin from './pages/Admin'
import PresidentMessage from './pages/PresidentMessage'
import ScrollToTop from './components/ScrollToTop'
import { AnimatePresence } from 'framer-motion'
import JournalSearch from './pages/JournalSearch'
import CaseOfTheMonth from './pages/CaseOfTheMonth'
import CaseDetail from './pages/CaseDetail'
import MembersDetails from './pages/MemberDetails'
import MembershipRegistration from './pages/MembershipRegistration';
import EventRegistration from './pages/EventRegistration';
import Gallery from './pages/Gallery';
import Auth from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import CompleteProfile from './pages/CompleteProfile';
import ResetPassword from './pages/ResetPassword';
import ElectionDashboard from './pages/ElectionDashboard';
import ElectionDetail from './pages/ElectionDetail';
import CandidateVote from './pages/CandidateVote';
import AdminOverview from './pages/admin/AdminOverview';
import AdminElections from './pages/admin/AdminElections';
import AdminElectionEditor from './pages/admin/AdminElectionEditor';
import AdminCandidates from './pages/admin/AdminCandidates';
import AdminVoteMonitor from './pages/admin/AdminVoteMonitor';
import AdminTurnout from './pages/admin/AdminTurnout';
import AdminGallery from './pages/admin/AdminGallery';
import AdminEvents from './pages/admin/AdminEvents';
import AdminCases from './pages/admin/AdminCases';
import AdminPublications from './pages/admin/AdminPublications';
import AdminGoverningBody from './pages/admin/AdminGoverningBody';
import AdminMembershipApplications from './pages/admin/AdminMembershipApplications';
import AdminMembershipApplicationDetail from './pages/admin/AdminMembershipApplicationDetail';
import AdminMembers from './pages/admin/AdminMembers';
import AdminMemberDetail from './pages/admin/AdminMemberDetail';
import AdminMessages from './pages/admin/AdminMessages';
import AdminMessageDetail from './pages/admin/AdminMessageDetail';
import EventDetail from './pages/EventDetail';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  const location = useLocation()
  const currentPage = location.pathname.slice(1) || 'home'
  const isAdminPath = location.pathname.startsWith('/admin')

  const routes = (
    <>
      <ScrollToTop />
      {/* Wrap Routes in AnimatePresence */}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/governing-body" element={<GoverningBody />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/secretary-message" element={<SecretaryMessage />} />
          <Route path="/president-message" element={<PresidentMessage />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/members-directory" element={<MembersDetails />} />
          <Route path="/academics-events" element={<AcademicsEvents />} />
          <Route path="/publications" element={<Publications />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/journal-search" element={<JournalSearch />} />
          <Route path="/case-of-the-month" element={<CaseOfTheMonth />} />
          <Route path="/case-of-the-month/:slug" element={<CaseDetail />} />
          <Route path="/join-membership" element={<MembershipRegistration />} />
          <Route path="/event-registration" element={<EventRegistration />} />
          <Route path="/events/:slug" element={<EventDetail />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/complete-profile"
            element={(
              <ProtectedRoute>
                <CompleteProfile />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/account"
            element={(
              <ProtectedRoute>
                <ElectionDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/elections/:electionSlug"
            element={(
              <ProtectedRoute>
                <ElectionDetail />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/elections/:electionSlug/candidates/:candidateSlug"
            element={(
              <ProtectedRoute>
                <CandidateVote />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminOverview />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/elections"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminElections />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/elections/new"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminElectionEditor />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/elections/:electionSlug"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminElectionEditor />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/elections/:electionSlug/candidates"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminCandidates />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/elections/:electionSlug/votes"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminVoteMonitor />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/elections/:electionSlug/turnout"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminTurnout />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/monitor"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminVoteMonitor />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/turnout"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminTurnout />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/gallery"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminGallery />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/membership"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminMembershipApplications />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/membership/:applicationId"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminMembershipApplicationDetail />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/members"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminMembers />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/members/:memberId"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminMemberDetail />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/events"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminEvents />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/cases"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminCases />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/publications"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminPublications />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/governing-body"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminGoverningBody />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/messages"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminMessages />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/messages/:messageId"
            element={(
              <ProtectedRoute requireAdmin>
                <AdminMessageDetail />
              </ProtectedRoute>
            )}
          />
        </Routes>
      </AnimatePresence>
    </>
  )

  if (isAdminPath) {
    return routes
  }

  return (
    <Layout currentPage={currentPage}>
      {routes}
    </Layout>
  )
}

export default App
