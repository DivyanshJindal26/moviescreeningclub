const Movie = require('@/models/movie.model')
const SeatMap = require('@/models/seatmap.model')
const { isAllowedLvl } = require('@/middleware')
const mongoose = require('mongoose')
const addMovie = (req, res) => {
  const {
    title,
    poster,
    description,
    releaseDate,
    genre,
    trailer,
    currentscreening,
    free
  } = req.body
  const newMovie = new Movie({
    title,
    poster,
    description,
    releaseDate,
    genre,
    trailer,
    currentscreening,
    free
  })
  newMovie
    .save()
    .then((movie) => res.status(201).json(movie))
    .catch((err) => res.status(400).json({ error: err.message }))
}

const getMovies = async (req, res) => {
  try {
    let movies = await Movie.find()
    movies = movies.map((movie) => {
      movie.showtimes = movie.showtimes.filter(
        (showtime) =>
          new Date(showtime.date) >= new Date(Date.now() - 3 * 60 * 60 * 1000)
      )
      return movie
    })
    if (!isAllowedLvl('movievolunteer', req.user?.usertype))
      movies.showtime = res.set(
        'Cache-Control',
        'public, max-age=30, s-maxage=0'
      )
    res.json(movies)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const updateMovie = async (req, res) => {
  const { id } = req.params
  try {
    const updatedMovie = await Movie.findByIdAndUpdate(id, req.body, {
      new: true
    })
    res.json(updatedMovie)
  } catch (error) {
    console.error('Error updating movie:', error)
    res.status(500).json({ error: 'Error updating movie' })
  }
}

const deleteMovie = async (req, res) => {
  try {
    const movieId = req.params.id

    const result = await Movie.findByIdAndDelete(movieId)

    if (!result) {
      return res.status(404).json({ error: 'Movie not found' })
    }

    res.status(200).json({ message: 'Movie deleted successfully' })
  } catch (error) {
    console.error('Error deleting movie:', error)
    res.status(500).json({ error: 'Error deleting movie' })
  }
}

const getMovieByShowTime = async (req, res) => {
  const user = req.user
  try {
    const { showtimeId } = req.params
    let movie = await Movie.findOne({ 'showtimes._id': showtimeId })
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' })
    }
    movie.showtimes = movie.showtimes
      .filter((showtime) => showtime.date >= new Date())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
    if (movie.showtimes.length === 0) {
      return res.status(404).json({ error: 'Showtime not found' })
    }

    if (!isAllowedLvl('movievolunteer', user?.usertype || 'standard')) {
      res.header('Cache-Control', 'public, max-age=10, s-maxage=0')
    }
    res.json(movie)
  } catch (error) {
    console.error('Error fetching trailer:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
const getMovieById = async (req, res) => {
  const user = req.user
  try {
    const { movieId } = req.params
    let movie = await Movie.findById(movieId)
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' })
    }
    movie.showtimes = movie.showtimes
      .filter(
        (showtime) => showtime.date >= new Date(Date.now() - 3 * 60 * 60 * 1000)
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    if (!isAllowedLvl('movievolunteer', user?.usertype || 'standard')) {
      res.header('Cache-Control', 'public, max-age=10, s-maxage=0')
    }
    res.json(movie)
  } catch (error) {
    console.error('Error fetching trailer:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const addMovieShowtimes = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const { movieId } = req.params

    const movie = await Movie.findById(movieId)
    if (!movie) {
      await session.abortTransaction()
      return res.status(404).json({ error: 'Movie not found' })
    }

    const { date } = req.body
    const inpShowtime = { date: new Date(date) }
    if (inpShowtime.date < new Date()) {
      await session.abortTransaction()
      return res
        .status(400)
        .json({ error: 'Showtime date must be in the future' })
    }
    movie.showtimes.push(inpShowtime)

    await movie.save({ session })

    const showtime = movie.showtimes[movie.showtimes.length - 1]
    const seatMap = new SeatMap({
      showtimeId: showtime._id,
      date: showtime.date
    })
    await seatMap.save({ session })
    await session.commitTransaction()
    return res.json(movie)
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    console.error('Error adding showtime:', error)
    res.status(500).json({ error: 'Error adding showtime' })
  } finally {
    session.endSession()
  }
}

const deleteMovieShowtimes = async (req, res) => {
  try {
    const { movieId, showtimeId } = req.params

    const movie = await Movie.findById(movieId)

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' })
    }

    movie.showtimes.pull({ _id: showtimeId })

    await movie.save()

    await SeatMap.deleteOne({ showtimeId })

    res.status(200).json({ message: 'Showtime deleted successfully' })
  } catch (error) {
    console.error('Error deleting showtime:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  addMovie,
  getMovies,
  updateMovie,
  deleteMovie,
  getMovieById,
  getMovieByShowTime,
  addMovieShowtimes,
  deleteMovieShowtimes
}
