import Header from './common/Header'
import Footer from './common/Footer'

const Layout = ({ children, currentPage }) => {
  return (
    <div className="bg-background-light dark:bg-background-dark font-body text-text-light dark:text-text-dark">
      <Header currentPage={currentPage} />
      {children}
      <Footer />
    </div>
  )
}

export default Layout