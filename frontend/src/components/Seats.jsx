import { rows } from '@/utils/seats'
const Seat = ({ seat, selected, onclick }) => {
  return (
    <button
      className={`bg-white-50 font-roboto m-0.5 w-8 cursor-pointer border border-gray-400 px-1 py-1 text-center text-[8px] ${
        selected
          ? 'bg-green-600 '
          : seat.occupied
            ? 'bg-gray-300 text-red-400'
            : ''
      }`}
      onClick={() => onclick(seat.name)}
      disabled={seat.occupied}
    >
      {seat.name}
    </button>
  )
}

const Seats = ({ seats, selectedSeats, setSelectedSeats, maxAllowed }) => {
  const handleSeatClick = (seatNo) => {
    if (selectedSeats.includes(seatNo)) {
      setSelectedSeats(selectedSeats.filter((seat) => seat !== seatNo))
    } else if (selectedSeats.length < maxAllowed) {
      setSelectedSeats([...selectedSeats, seatNo])
    } else if (maxAllowed == -1) {
      setSelectedSeats([...selectedSeats, seatNo])
    } else {
      alert(`You can only select ${maxAllowed} seats`)
    }
  }
  const TopCenter = () => {
    const rowDivs = []
    let c = 0
    for (let row of rows) {
      if (!['Q', 'R', 'S', 'T'].includes(row.prefix)) {
        rowDivs.push(
          <div
            key={c}
            className="flex w-full flex-row-reverse justify-between px-12"
          >
            <div className="flex flex-row-reverse">
              {seats
                .filter(
                  (s) =>
                    s.name.includes(row.prefix) &&
                    s.sec == 5 &&
                    ['16', '17', '18'].includes(s.name.slice(1))
                )
                .map((seat, i) => (
                  <Seat
                    key={i}
                    seat={seat}
                    selected={selectedSeats.includes(seat.name)}
                    occupied={false}
                    onclick={handleSeatClick}
                  />
                ))}
            </div>
            <div className="flex flex-row-reverse">
              {seats
                .filter(
                  (s) =>
                    s.name.includes(row.prefix) &&
                    s.sec == 5 &&
                    !['16', '17', '18'].includes(s.name.slice(1))
                )
                .map((seat, i) => (
                  <Seat
                    key={i}
                    seat={seat}
                    selected={selectedSeats.includes(seat.name)}
                    occupied={false}
                    onclick={handleSeatClick}
                  />
                ))}
            </div>
          </div>
        )
      } else {
        rowDivs.push(
          <div key={c} className="flex flex-row-reverse justify-center">
            {seats
              .filter((s) => s.name.includes(row.prefix) && s.sec == 5)
              .map((seat, i) => (
                <Seat
                  key={i}
                  seat={seat}
                  selected={selectedSeats.includes(seat.name)}
                  occupied={false}
                  onclick={handleSeatClick}
                />
              ))}
          </div>
        )
      }
      c++
    }

    return <div className="flex flex-col">{rowDivs}</div>
  }
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <svg
          className="w-[400px]"
          viewBox="0 0 490 43"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M244.37 -1.90735e-06C352.171 -1.90735e-06 445.182 14.928 488.233 36.4934C489.9 37.3283 490.402 39.4251 489.367 40.9755V40.9755C488.484 42.2981 486.783 42.7683 485.344 42.0913C441.116 21.2837 349.819 7 244.37 7C140.357 7 50.1128 20.8972 5.22839 41.2446C3.79169 41.8959 2.11259 41.4219 1.23033 40.1143V40.1143C0.16353 38.5332 0.695665 36.3828 2.415 35.557C46.2645 14.4971 138.135 -1.90735e-06 244.37 -1.90735e-06Z"
            fill="#D9D9D9"
          />
        </svg>
        <p className="text-xl font-bold -mt-6 pb-4">Screen</p>
      </div>
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          {rows.map((row, i) => (
            <div key={i} className="flex flex-row-reverse">
              {seats
                .filter((s) => s.name.includes(row.prefix) && s.sec === 1)
                .map((seat, i) => (
                  <Seat
                    key={i}
                    seat={seat}
                    selected={selectedSeats.includes(seat.name)}
                    onclick={handleSeatClick}
                  />
                ))}
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center">
          {rows.map((row, i) => (
            <div key={i} className="flex flex-row-reverse">
              {seats
                .filter((s) => s.name.includes(row.prefix) && s.sec == 2)
                .map((seat, i) => (
                  <Seat
                    key={i}
                    seat={seat}
                    selected={selectedSeats.includes(seat.name)}
                    onclick={handleSeatClick}
                  />
                ))}
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center">
          {rows.map((row, i) => (
            <div key={i} className="flex flex-row-reverse">
              {seats
                .filter((s) => s.name.includes(row.prefix) && s.sec == 3)
                .map((seat, i) => (
                  <Seat
                    key={i}
                    seat={seat}
                    selected={selectedSeats.includes(seat.name)}
                    onclick={handleSeatClick}
                  />
                ))}
            </div>
          ))}
        </div>
      </div>
      <p className="col-span-3 text-center text-lg font-bold">Entrance</p>
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          {rows.map((row, i) => (
            <div key={i} className="flex flex-row-reverse">
              {seats
                .filter((s) => s.name.includes(row.prefix) && s.sec == 4)
                .map((seat, i) => (
                  <Seat
                    key={i}
                    seat={seat}
                    selected={selectedSeats.includes(seat.name)}
                    onclick={handleSeatClick}
                  />
                ))}
            </div>
          ))}
        </div>
        <TopCenter />
        <div className="flex flex-col items-center">
          {rows.map((row, i) => (
            <div key={i} className="flex flex-row-reverse">
              {seats
                .filter((s) => s.name.includes(row.prefix) && s.sec == 6)
                .map((seat, i) => (
                  <Seat
                    key={i}
                    seat={seat}
                    selected={selectedSeats.includes(seat.name)}
                    onclick={handleSeatClick}
                  />
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Seats
