import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { DashboardPage } from './pages/DashboardPage'
import { CertificationsPage } from './pages/CertificationsPage'
import { MaterialsPage } from './pages/MaterialsPage'
import { SchedulePage } from './pages/SchedulePage'
import { PracticeQuiz } from './components/PracticeQuiz'
import { EmptyState } from './components/EmptyState'
import { LoadState } from './components/LoadState'
import { MenuIcon } from './lib/icons'
import { useHashRoute } from './lib/useHashRoute'
import {
  fetchCertifications,
  createCertification,
  updateCertification,
} from './lib/api'
import { daysUntil } from './lib/format'
import type { Certification, CertPatch, NewCertInput } from './data/types'
import styles from './App.module.css'

export default function App() {
  const [certs, setCerts] = useState<Certification[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  // Empty until the user picks one; DashboardPage falls back to the most active cert.
  const [focusId, setFocusId] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const { route, param, navigate } = useHashRoute()

  const load = useCallback(async () => {
    setLoadError(false)
    setCerts(null)
    try {
      setCerts(await fetchCertifications())
    } catch {
      setLoadError(true)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // On view change: close the mobile drawer and return to the top.
  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo({ top: 0 })
  }, [route])

  const counts = useMemo(() => {
    const list = certs ?? []
    return {
      certifications: list.length,
      materials: list.reduce((sum, c) => sum + c.materials.length, 0),
      schedule: list.filter(
        (c) => c.status === 'scheduled' && c.examDate && daysUntil(c.examDate) >= 0,
      ).length,
    }
  }, [certs])

  function openCert(id: string) {
    setFocusId(id)
    navigate('dashboard')
  }

  function takeQuiz(id: string) {
    setFocusId(id)
    navigate('quiz', id)
  }

  async function addCert(input: NewCertInput): Promise<void> {
    const created = await createCertification(input)
    setCerts((prev) => (prev ? [created, ...prev] : [created]))
  }

  async function updateCert(id: string, patch: CertPatch): Promise<Certification> {
    const updated = await updateCertification(id, patch)
    replaceCert(updated)
    return updated
  }

  // Swap a full cert into state (e.g. after server-side quiz generation).
  function replaceCert(updated: Certification) {
    setCerts((prev) =>
      prev ? prev.map((c) => (c.id === updated.id ? updated : c)) : prev,
    )
  }

  function renderContent() {
    if (loadError) return <LoadState variant="error" onRetry={load} />
    if (certs === null) return <LoadState variant="loading" />
    if (certs.length === 0 && route === 'dashboard') return <EmptyState />

    switch (route) {
      case 'certifications':
        return (
          <CertificationsPage certs={certs} onAdd={addCert} onUpdate={updateCert} />
        )
      case 'materials':
        return <MaterialsPage certs={certs} />
      case 'schedule':
        return <SchedulePage certs={certs} onOpen={openCert} />
      default:
        return (
          <DashboardPage
            certs={certs}
            focusId={focusId}
            onFocus={setFocusId}
            onUpdate={updateCert}
            onReplace={replaceCert}
            onTakeQuiz={takeQuiz}
          />
        )
    }
  }

  // The practice test is a full-screen, distraction-free view — rendered
  // outside the sidebar shell.
  const quizCert =
    route === 'quiz' && certs ? certs.find((c) => c.id === param) : undefined
  const showQuiz = !!quizCert && quizCert.quizQuestions.length > 0

  // Redirect stale quiz deep-links (unknown cert / no questions) back home.
  useEffect(() => {
    if (route === 'quiz' && certs !== null && !showQuiz) navigate('dashboard')
  }, [route, certs, showQuiz, navigate])

  if (showQuiz) {
    return (
      <PracticeQuiz
        key={quizCert.id}
        cert={quizCert}
        onUpdate={updateCert}
        onExit={() => navigate('dashboard')}
      />
    )
  }

  return (
    <div className={styles.app}>
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        route={route}
        counts={counts}
      />

      <div className={styles.main}>
        <div className={styles.mobileBar}>
          <button
            type="button"
            className={styles.menuBtn}
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <MenuIcon size={22} />
          </button>
          <span className={styles.mobileBrand}>Certus</span>
        </div>

        <main className={styles.content}>{renderContent()}</main>
      </div>
    </div>
  )
}
