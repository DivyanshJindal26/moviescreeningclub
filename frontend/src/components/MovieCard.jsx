import { Link } from 'react-router-dom'

const MovieCard = ({ movie, small = true, navigate = false, children }) => {
  const Container = navigate ? Link : 'div'
  const containerProps = navigate ? { to: `/movie?movieId=${movie._id}` } : {}

  return (
    <Container
      {...containerProps}
      className="flex h-full w-full flex-col justify-start gap-2 rounded-xl bg-white dark:bg-[#0C0C0C] shadow-lg dark:shadow-white/30 relative"
    >
      <img
        className="w-full grow rounded-t-xl object-cover min-h-[100px] max-h-[400px]"
        src={movie.poster}
        alt={movie.title}
      />
      {movie.free && (
        <div className="bg-green-600 text-white font-semibold absolute top-0 py-2 px-4 rounded-br-lg rounded-tl-lg">
          Free
        </div>
      )}
      <div
        style={{
          maxHeight: small ? '120px' : 'auto'
        }}
        className="flex flex-col overflow-hidden p-4"
      >
        <p className="font-bn text-xl font-semibold max-sm:text-lg sm:text-2xl">
          {movie.title}
        </p>
        <p className="sm:text-md text-xs">{movie.genre}</p>
        {children}
      </div>
    </Container>
  )
}

export default MovieCard
