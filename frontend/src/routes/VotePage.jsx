import { useLogin } from '@/components/LoginContext'
import MovieCard from '@/components/MovieCard'
import { Arrow } from '@/components/icons/Vote'
import { api } from '@/utils/api'
import { isAllowedLvl } from '@/utils/levelCheck'
import { useEffect, useState } from 'react'

const MovieList = () => {
  const { user } = useLogin()
  const [movies, setMovies] = useState([])
  const [newMovieData, setNewMovieData] = useState({
    title: '',
    poster: '',
    genre: ''
  })

  useEffect(() => {
    fetchMovies()
  }, [])

  const fetchMovies = async () => {
    try {
      const response = await api.get(`/vote/movies`)
      if (response.status !== 200) {
        throw new Error('Failed to fetch movies')
      }
      const fetchedMovies = response.data.movies.map((movie) => {
        const voted = movie.voters.includes(user?.email)
        return { ...movie, voted }
      })
      setMovies(fetchedMovies)
    } catch (error) {
      console.error('Error fetching movies:', error)
      setMovies([])
    }
  }

  const handleVoteClick = async (movieId, voteType) => {
    try {
      const response = await api.post(`/vote`, {
        movieId,
        voteType,
        userEmail: user?.email
      })
      if (response.status !== 200) {
        throw new Error('Failed to record vote')
      }
      fetchMovies()
    } catch (error) {
      console.error('Error voting for movie:', error)
    }
  }

  const handleAddMovie = async (e) => {
    e.preventDefault()
    try {
      const response = await api.post(`/vote/add`, newMovieData)
      if (response.status !== 201) {
        throw new Error('Failed to add movie')
      }
      setNewMovieData({
        title: '',
        poster: '',
        genre: ''
      })
      fetchMovies()
    } catch (error) {
      console.error('Error adding movie:', error)
    }
  }

  const handleDeleteMovie = async (movieId) => {
    try {
      const response = await api.post(`/vote/delete/${movieId}`)
      if (response.status !== 200) {
        throw new Error('Failed to delete movie')
      }
      fetchMovies()
    } catch (error) {
      console.error('Error deleting movie:', error)
    }
  }
  const MovieCardVote = ({ movie }) => {
    const totalVotes = movie.yesCount + movie.noCount
    const yesPercentage =
      totalVotes === 0 ? 0 : (movie.yesCount / totalVotes) * 100
    const noPercentage =
      totalVotes === 0 ? 0 : (movie.noCount / totalVotes) * 100
    return (
      <MovieCard movie={movie} small={false}>
        <div className="bg-gray-4 00 my-2 flex h-2 w-full overflow-hidden rounded-lg">
          <div
            style={{ width: `${yesPercentage}%` }}
            className="h-2 bg-green-400"
          />
          <div
            style={{ width: `${noPercentage}%` }}
            className="h-2 bg-red-400"
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            onClick={() => handleVoteClick(movie._id, 'yes')}
            disabled={movie.voted}
            className={`flex grow justify-center rounded-md bg-green-600 px-2 py-2 text-white ${
              movie.voted ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            <Arrow />
          </button>
          <button
            onClick={() => handleVoteClick(movie._id, 'no')}
            disabled={movie.voted}
            className={`flex grow rotate-180 transform justify-center rounded-md bg-red-600 px-2 py-2 text-white ${
              movie.voted ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            <Arrow />
          </button>
        </div>
        {isAllowedLvl('movievolunteer', user?.usertype || 'standard') && (
          <button
            onClick={() => handleDeleteMovie(movie._id)}
            className="mt-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Delete
          </button>
        )}
      </MovieCard>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center p-6">
      <p className="text-2xl font-bold capitalize">
        vote the movies you want to watch next
      </p>
      <div className="mt-8 flex w-[95%] grid-cols-1 flex-wrap gap-10 max-sm:flex-col max-sm:items-center">
        {movies.map((movie) => (
          <div
            key={movie._id}
            className="h-full w-[80%] sm:w-[40vw] md:w-[25vw] lg:w-[20vw]"
          >
            <MovieCardVote movie={movie} />
          </div>
        ))}
        {isAllowedLvl('movievolunteer', user?.usertype || 'standard') && (
          <form
            onSubmit={handleAddMovie}
            className="flex h-fit w-full flex-col items-center gap-2 rounded-lg bg-white dark:bg-[#141414] p-4 shadow-md sm:w-3/4 sm:p-6 lg:w-[30vw]"
          >
            <p className="text-lg font-semibold">Add New Movie</p>
            <input
              type="text"
              placeholder="Title"
              value={newMovieData.title}
              className="mt-2 w-full rounded-md bg-[#ebeaea] dark:bg-[#212121] px-4 py-2"
              onChange={(e) =>
                setNewMovieData({ ...newMovieData, title: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Poster URL"
              value={newMovieData.poster}
              className="w-full rounded-md bg-[#ebeaea] dark:bg-[#212121] px-4 py-2"
              onChange={(e) =>
                setNewMovieData({ ...newMovieData, poster: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Genre"
              value={newMovieData.genre}
              className="w-full rounded-md bg-[#ebeaea] dark:bg-[#212121] px-4 py-2"
              onChange={(e) =>
                setNewMovieData({ ...newMovieData, genre: e.target.value })
              }
            />
            <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-green-500 text-white dark:bg-green-900 px-4 py-2 text-lg sm:text-xl">
              Add
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default MovieList
