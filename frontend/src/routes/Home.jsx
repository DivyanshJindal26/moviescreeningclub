import { Loading } from '@/components/icons/Loading'
import MovieCard from '@/components/MovieCard'
import { api } from '@/utils/api'
import useDeviceSize from '@/utils/useDeviceSize'
import { useEffect, useState } from 'react'

const GrpCard = ({ type, movies, shouldNav = true }) => {
  const [showMore, setShowMore] = useState(false)
  const deviceSize = useDeviceSize()
  const scrollToElement = (elementId, additionalOffset = 0) => {
    const element = document.getElementById(elementId)
    if (!element) return
    const elementPosition = element.offsetTop - additionalOffset
    window.scrollTo({
      top: elementPosition,
      behavior: 'smooth'
    })
  }
  const limit = ['xs', 'sm'].includes(deviceSize)
    ? 2
    : ['md', 'lg'].includes(deviceSize)
      ? 3
      : 4
  return (
    <div id={type} className="flex w-4/5 flex-col gap-2">
      <p className="font-bn text-2xl text-[#E40C2B]">{type}</p>
      <div className="rounded-xl flex flex-col items-center gap-2 bg-white dark:bg-[#212121] p-4 sm:gap-6 sm:p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {movies.slice(0, showMore ? movies.length : limit).map((movie, i) => (
            <MovieCard movie={movie} key={i} navigate={shouldNav} />
          ))}
        </div>
        {movies.length > limit && (
          <p
            className="w-fit font-inter cursor-pointer text-center text-sm hover:bg-gray-200 dark:hover:bg-gray-900 p-2 rounded-xl"
            onClick={() => {
              setShowMore(!showMore)
              showMore && scrollToElement(type, 120)
            }}
          >
            {showMore ? 'Show Less' : 'Show More'}
          </p>
        )}
      </div>
    </div>
  )
}

const Home = () => {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get(`/movie`)
      .then((response) => {
        setMovies(response.data)
      })
      .catch((error) => {
        console.error('Error fetching movies:', error)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loading />
      </div>
    )
  }

  const ongoingMovies = movies.filter(
    (movie) => movie?.currentscreening && !movie?.past
  )
  const upcomingMovies = movies.filter(
    (movie) => !movie?.currentscreening && !movie?.past
  )
  const pastMovies = movies.filter((movie) => movie?.past)
  return (
    <div className="flex flex-col items-center gap-6">
      {ongoingMovies.length > 0 && (
        <GrpCard type="Ongoing Movies" movies={ongoingMovies} />
      )}
      {upcomingMovies.length > 0 && (
        <GrpCard type="Upcoming Movies" movies={upcomingMovies} />
      )}
      {pastMovies.length > 0 && (
        <GrpCard type="Past Movies" movies={pastMovies} shouldNav={false} />
      )}
    </div>
  )
}

export default Home
