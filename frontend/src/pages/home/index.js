import HomeView from 'src/views/pages/home'
import { HomeDashboardProvider } from 'src/context/HomeDashboardContext'

const Home = () => {
  return (
    <HomeDashboardProvider>
      <HomeView />
    </HomeDashboardProvider>
  )
}

export default Home
