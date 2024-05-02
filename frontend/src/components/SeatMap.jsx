import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import moment from "moment";
import { SERVERIP } from "../config";
const SeatMapPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const paymentId = searchParams.get("paymentId");
  const showtimeId = location.pathname.split("/")[2];
  const movie = searchParams.get("movie");
  const date = searchParams.get("date");
  const time = searchParams.get("time");
  const date1 = moment(date).format("DD-MM-YYYY");
  const time1 = moment(time, "HH:mm").format("hh:mm A");

  const [selectedSeat, setSelectedSeat] = useState(null);
  const [assignedSeat, setAssignedSeat] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [seatOccupancy, setSeatOccupancy] = useState({});
  let column = 0;
  const navigate = useNavigate();

  useEffect(() => {
    const userType = localStorage.getItem("userType");
    if (!userType) {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    const initialValue = document.body.style.zoom;

    // Change zoom level on mount
    document.body.style.zoom = "75%";

    return () => {
      // Restore default value
      document.body.style.zoom = initialValue;
    };
  }, []);

  useEffect(() => {
    const fetchSeatOccupancy = async () => {
      try {
        const response = await axios.get(
          `${SERVERIP}/seatmaprouter/seatmap/${showtimeId}/seats`
        );
        setSeatOccupancy(response.data);
        console.log(movie);
        console.log(date1);
        console.log(time1);
      } catch (error) {
        console.error("Error fetching seat occupancy:", error);
      }
    };

    fetchSeatOccupancy();
  }, [showtimeId]);

  useEffect(() => {
    axios
      .get(`${SERVERIP}/QR/qrData/${paymentId}`)
      .then((response) => {
        const qrData = response.data;
        if (qrData && !qrData.used) {
          return;
        } else {
          navigate("/QR");
        }
      })
      .catch((error) => {
        console.error("Error fetching QR data:", error);
        navigate("/QR");
      });
  }, [paymentId, navigate]);

  const sendEmail = async () => {
    try {
      const emailData = {
        email: localStorage.getItem("loggedInUserEmail"),
        seatNumber: selectedSeat,
      };
      const response = await axios.post(`${SERVERIP}/QR/sendEmail`, emailData);
      console.log(response.data.message);
    } catch (error) {
      console.error("Error sending email:", error);
    }
  };

  const handleSeatSelection = (seat) => {
    if (assignedSeat || seatOccupancy[seat]) {
      setErrorMessage(
        "This seat is already occupied. Please select another seat."
      );
      return;
    }
    setSelectedSeat(seat);
    setErrorMessage(null);
  };

  const handleConfirmSeat = async () => {
    try {
      await axios.put(
        `${SERVERIP}/seatmaprouter/seatmap/${showtimeId}/${selectedSeat}`
      );
      setAssignedSeat(true);
      await axios.put(`${SERVERIP}/QR/markUsed/${paymentId}`, {
        showtime: time1,
        date: date1,
      });

      // Send email
      await sendEmail();

      setErrorMessage(
        `The seat ${selectedSeat} is successfully assigned to you. Redirecting to QRs...`
      );
      localStorage.setItem("seatassignment", "false");
      setTimeout(() => {
        window.location.href = "/QR";
      }, 5000);
    } catch (error) {
      console.error("Error assigning seat:", error);
      if (error.response && error.response.status === 400) {
        setErrorMessage(`Seat ${selectedSeat} is already occupied`);
      } else {
        setErrorMessage("An error occurred while assigning the seat");
      }
    }
  };

  return (
    <div className="seat-booking font-monts overflow-auto">
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      {assignedSeat && (
        <div className="flex justify-center items-center h-screen">
          <h6 className="text-3xl">Assigning seat....</h6>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10"
            viewBox="0 0 24 24"
          >
            <defs>
              <filter id="svgSpinnersGooeyBalls20">
                <feGaussianBlur
                  in="SourceGraphic"
                  result="y"
                  stdDeviation={1}
                ></feGaussianBlur>
                <feColorMatrix
                  in="y"
                  result="z"
                  values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -7"
                ></feColorMatrix>
                <feBlend in="SourceGraphic" in2="z"></feBlend>
              </filter>
            </defs>
            <g filter="url(#svgSpinnersGooeyBalls20)">
              <circle cx={5} cy={12} r={4} fill="currentColor">
                <animate
                  attributeName="cx"
                  calcMode="spline"
                  dur="2s"
                  keySplines=".36,.62,.43,.99;.79,0,.58,.57"
                  repeatCount="indefinite"
                  values="5;8;5"
                ></animate>
              </circle>
              <circle cx={19} cy={12} r={4} fill="currentColor">
                <animate
                  attributeName="cx"
                  calcMode="spline"
                  dur="2s"
                  keySplines=".36,.62,.43,.99;.79,0,.58,.57"
                  repeatCount="indefinite"
                  values="19;16;19"
                ></animate>
              </circle>
              <animateTransform
                attributeName="transform"
                dur="0.75s"
                repeatCount="indefinite"
                type="rotate"
                values="0 12 12;360 12 12"
              ></animateTransform>
            </g>
          </svg>
        </div>
      )}
      {!assignedSeat && (
        <div>
          <div className="flex justify-evenly gap-4">
            <div className="flex flex-col gap-2 items-center mt-32">
              {[...Array(1).keys()].map((row) => (
                <div key={row} className="flex gap-2">
                  {[...Array(10).keys()].map((col) => {
                    const seatNumber = column + 1;
                    column = seatNumber;
                    return (
                      <div
                        key={col}
                        className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                          selectedSeat === seatNumber
                            ? "bg-green-600"
                            : seatOccupancy[seatNumber]
                            ? "bg-gray-200"
                            : ""
                        }`}
                        onClick={() => handleSeatSelection(seatNumber)}
                        disabled={assignedSeat || seatOccupancy[seatNumber]}
                        style={{
                          color: seatOccupancy[seatNumber] ? "red" : "black",
                        }}
                      >
                        <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                          {seatNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
              {[...Array(2).keys()].map((row) => (
                <div key={row} className="flex gap-2">
                  {[...Array(11).keys()].map((col) => {
                    const seatNumber = column + 1;
                    column = seatNumber;
                    return (
                      <div
                        key={col}
                        className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                          selectedSeat === seatNumber
                            ? "bg-green-600"
                            : seatOccupancy[seatNumber]
                            ? "bg-gray-200"
                            : ""
                        }`}
                        onClick={() => handleSeatSelection(seatNumber)}
                        disabled={assignedSeat || seatOccupancy[seatNumber]}
                        style={{
                          color: seatOccupancy[seatNumber] ? "red" : "black",
                        }}
                      >
                        <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                          {seatNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
              {[...Array(2).keys()].map((row) => (
                <div key={row} className="flex gap-2">
                  {[...Array(12).keys()].map((col) => {
                    const seatNumber = column + 1;
                    column = seatNumber;
                    return (
                      <div
                        key={col}
                        className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                          selectedSeat === seatNumber
                            ? "bg-green-600"
                            : seatOccupancy[seatNumber]
                            ? "bg-gray-200"
                            : ""
                        }`}
                        onClick={() => handleSeatSelection(seatNumber)}
                        disabled={assignedSeat || seatOccupancy[seatNumber]}
                        style={{
                          color: seatOccupancy[seatNumber] ? "red" : "black",
                        }}
                      >
                        <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                          {seatNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
              {[...Array(2).keys()].map((row) => (
                <div key={row} className="flex gap-2">
                  {[...Array(13).keys()].map((col) => {
                    const seatNumber = column + 1;
                    column = seatNumber;
                    return (
                      <div
                        key={col}
                        className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                          selectedSeat === seatNumber
                            ? "bg-green-600"
                            : seatOccupancy[seatNumber]
                            ? "bg-gray-200"
                            : ""
                        }`}
                        onClick={() => handleSeatSelection(seatNumber)}
                        disabled={assignedSeat || seatOccupancy[seatNumber]}
                        style={{
                          color: seatOccupancy[seatNumber] ? "red" : "black",
                        }}
                      >
                        <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                          {seatNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
              {[...Array(2).keys()].map((row) => (
                <div key={row} className="flex gap-2">
                  {[...Array(14).keys()].map((col) => {
                    const seatNumber = column + 1;
                    column = seatNumber;
                    return (
                      <div
                        key={col}
                        className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                          selectedSeat === seatNumber
                            ? "bg-green-600"
                            : seatOccupancy[seatNumber]
                            ? "bg-gray-200"
                            : ""
                        }`}
                        onClick={() => handleSeatSelection(seatNumber)}
                        disabled={assignedSeat || seatOccupancy[seatNumber]}
                        style={{
                          color: seatOccupancy[seatNumber] ? "red" : "black",
                        }}
                      >
                        <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                          {seatNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="w-4"></div> {/* Entrance space */}
            <div className="flex flex-col gap-2 items-center">
              <div className="flex justify-center mb-4 w-full">
                <span
                  className="font-semibold text-lg"
                  style={{ marginBottom: "20px" }}
                >
                  Screen
                </span>
              </div>
              <svg
                className="w-3/4 mx-auto mb-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 100 10"
              >
                <path
                  d="M0 5 C 25 -2, 75 -2, 100 5"
                  fill="none"
                  stroke="black"
                  strokeWidth="0.3"
                />
              </svg>
              {[...Array(1).keys()].map((row) => (
                <div key={row} className="flex gap-2">
                  {[...Array(7).keys()].map((col) => {
                    const seatNumber = column + 1;
                    column = seatNumber;
                    return (
                      <div
                        key={col}
                        className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                          selectedSeat === seatNumber
                            ? "bg-green-600"
                            : seatOccupancy[seatNumber]
                            ? "bg-gray-200"
                            : ""
                        }`}
                        onClick={() => handleSeatSelection(seatNumber)}
                        disabled={assignedSeat || seatOccupancy[seatNumber]}
                        style={{
                          color: seatOccupancy[seatNumber] ? "red" : "black",
                        }}
                      >
                        <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                          {seatNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
              {[...Array(2).keys()].map((row) => (
                <div key={row} className="flex gap-2">
                  {[...Array(8).keys()].map((col) => {
                    const seatNumber = column + 1;
                    column = seatNumber;
                    return (
                      <div
                        key={col}
                        className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                          selectedSeat === seatNumber
                            ? "bg-green-600"
                            : seatOccupancy[seatNumber]
                            ? "bg-gray-200"
                            : ""
                        }`}
                        onClick={() => handleSeatSelection(seatNumber)}
                        disabled={assignedSeat || seatOccupancy[seatNumber]}
                        style={{
                          color: seatOccupancy[seatNumber] ? "red" : "black",
                        }}
                      >
                        <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                          {seatNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
              {[...Array(1).keys()].map((row) => (
                <div key={row} className="flex gap-2">
                  {[...Array(9).keys()].map((col) => {
                    const seatNumber = column + 1;
                    column = seatNumber;
                    return (
                      <div
                        key={col}
                        className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                          selectedSeat === seatNumber
                            ? "bg-green-600"
                            : seatOccupancy[seatNumber]
                            ? "bg-gray-200"
                            : ""
                        }`}
                        onClick={() => handleSeatSelection(seatNumber)}
                        disabled={assignedSeat || seatOccupancy[seatNumber]}
                        style={{
                          color: seatOccupancy[seatNumber] ? "red" : "black",
                        }}
                      >
                        <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                          {seatNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
              {[...Array(2).keys()].map((row) => (
                <div key={row} className="flex gap-2">
                  {[...Array(10).keys()].map((col) => {
                    const seatNumber = column + 1;
                    column = seatNumber;
                    return (
                      <div
                        key={col}
                        className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                          selectedSeat === seatNumber
                            ? "bg-green-600"
                            : seatOccupancy[seatNumber]
                            ? "bg-gray-200"
                            : ""
                        }`}
                        onClick={() => handleSeatSelection(seatNumber)}
                        disabled={assignedSeat || seatOccupancy[seatNumber]}
                        style={{
                          color: seatOccupancy[seatNumber] ? "red" : "black",
                        }}
                      >
                        <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                          {seatNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
              {[...Array(1).keys()].map((row) => (
                <div key={row} className="flex gap-2">
                  {[...Array(11).keys()].map((col) => {
                    const seatNumber = column + 1;
                    column = seatNumber;
                    return (
                      <div
                        key={col}
                        className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                          selectedSeat === seatNumber
                            ? "bg-green-600"
                            : seatOccupancy[seatNumber]
                            ? "bg-gray-200"
                            : ""
                        }`}
                        onClick={() => handleSeatSelection(seatNumber)}
                        disabled={assignedSeat || seatOccupancy[seatNumber]}
                        style={{
                          color: seatOccupancy[seatNumber] ? "red" : "black",
                        }}
                      >
                        <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                          {seatNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
              {[...Array(2).keys()].map((row) => (
                <div key={row} className="flex gap-2">
                  {[...Array(12).keys()].map((col) => {
                    const seatNumber = column + 1;
                    column = seatNumber;
                    return (
                      <div
                        key={col}
                        className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                          selectedSeat === seatNumber
                            ? "bg-green-600"
                            : seatOccupancy[seatNumber]
                            ? "bg-gray-200"
                            : ""
                        }`}
                        onClick={() => handleSeatSelection(seatNumber)}
                        disabled={assignedSeat || seatOccupancy[seatNumber]}
                        style={{
                          color: seatOccupancy[seatNumber] ? "red" : "black",
                        }}
                      >
                        <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                          {seatNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="w-4"></div> {/* Entrance space */}
            <div className="flex justify-between gap-4">
              {/* Container for the 5x5 block */}
              <div className="flex flex-col gap-2 items-center mt-32">
                {[...Array(1).keys()].map((row) => (
                  <div key={row} className="flex gap-2">
                    {[...Array(10).keys()].map((col) => {
                      const seatNumber = column + 1;
                      column = seatNumber;
                      return (
                        <div
                          key={col}
                          className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                            selectedSeat === seatNumber
                              ? "bg-green-600"
                              : seatOccupancy[seatNumber]
                              ? "bg-gray-200"
                              : ""
                          }`}
                          disabled={assignedSeat || seatOccupancy[seatNumber]}
                          style={{
                            color: seatOccupancy[seatNumber] ? "red" : "black",
                          }}
                        >
                          <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                            {seatNumber}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {[...Array(2).keys()].map((row) => (
                  <div key={row} className="flex gap-2">
                    {[...Array(11).keys()].map((col) => {
                      const seatNumber = column + 1;
                      column = seatNumber;
                      return (
                        <div
                          key={col}
                          className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                            selectedSeat === seatNumber
                              ? "bg-green-600"
                              : seatOccupancy[seatNumber]
                              ? "bg-gray-200"
                              : ""
                          }`}
                          disabled={assignedSeat || seatOccupancy[seatNumber]}
                          style={{
                            color: seatOccupancy[seatNumber] ? "red" : "black",
                          }}
                        >
                          <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                            {seatNumber}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {[...Array(2).keys()].map((row) => (
                  <div key={row} className="flex gap-2">
                    {[...Array(12).keys()].map((col) => {
                      const seatNumber = column + 1;
                      column = seatNumber;
                      return (
                        <div
                          key={col}
                          className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                            selectedSeat === seatNumber
                              ? "bg-green-600"
                              : seatOccupancy[seatNumber]
                              ? "bg-gray-200"
                              : ""
                          }`}
                          disabled={assignedSeat || seatOccupancy[seatNumber]}
                          style={{
                            color: seatOccupancy[seatNumber] ? "red" : "black",
                          }}
                        >
                          <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                            {seatNumber}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {[...Array(1).keys()].map((row) => (
                  <div key={row} className="flex gap-2">
                    {[...Array(13).keys()].map((col) => {
                      const seatNumber = column + 1;
                      column = seatNumber;
                      return (
                        <div
                          key={col}
                          className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                            selectedSeat === seatNumber
                              ? "bg-green-600"
                              : seatOccupancy[seatNumber]
                              ? "bg-gray-200"
                              : ""
                          }`}
                          disabled={assignedSeat || seatOccupancy[seatNumber]}
                          style={{
                            color: seatOccupancy[seatNumber] ? "red" : "black",
                          }}
                        >
                          <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                            {seatNumber}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {[...Array(2).keys()].map((row) => (
                  <div key={row} className="flex gap-2">
                    {[...Array(14).keys()].map((col) => {
                      const seatNumber = column + 1;
                      column = seatNumber;
                      return (
                        <div
                          key={col}
                          className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                            selectedSeat === seatNumber
                              ? "bg-green-600"
                              : seatOccupancy[seatNumber]
                              ? "bg-gray-200"
                              : ""
                          }`}
                          disabled={assignedSeat || seatOccupancy[seatNumber]}
                          style={{
                            color: seatOccupancy[seatNumber] ? "red" : "black",
                          }}
                        >
                          <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                            {seatNumber}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {[...Array(1).keys()].map((row) => (
                  <div key={row} className="flex gap-2">
                    {[...Array(15).keys()].map((col) => {
                      const seatNumber = column + 1;
                      column = seatNumber;
                      return (
                        <div
                          key={col}
                          className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                            selectedSeat === seatNumber
                              ? "bg-green-600"
                              : seatOccupancy[seatNumber]
                              ? "bg-gray-200"
                              : ""
                          }`}
                          disabled={assignedSeat || seatOccupancy[seatNumber]}
                          style={{
                            color: seatOccupancy[seatNumber] ? "red" : "black",
                          }}
                        >
                          <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                            {seatNumber}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mb-8"></div> {/* Vertical spacing */}
          <div className="flex justify-evenly gap-4 mb-4">
            <div className="flex flex-col gap-2 items-center mt-16">
              {[...Array(11).keys()].map((row) => (
                <div key={row} className="flex gap-2">
                  {[...Array(15).keys()].map((col) => {
                    const seatNumber = column + 1;
                    column = seatNumber;
                    return (
                      <div
                        key={col}
                        className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                          selectedSeat === seatNumber
                            ? "bg-green-600"
                            : seatOccupancy[seatNumber]
                            ? "bg-gray-200"
                            : ""
                        }`}
                        onClick={() => handleSeatSelection(seatNumber)}
                        disabled={assignedSeat || seatOccupancy[seatNumber]}
                        style={{
                          color: seatOccupancy[seatNumber] ? "red" : "black",
                        }}
                      >
                        <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                          {seatNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="w-4"></div> {/* Entrance space */}
            <div className="flex flex-col gap-2 items-center">
              <div className="flex justify-center mt-4 mb-4">
                <span className="font-semibold text-lg">Entrance</span>
              </div>
              <div className="flex gap-64">
                <div className="flex flex-col gap-2">
                  {[...Array(7).keys()].map((row) => (
                    <div key={row} className="flex gap-2">
                      {[...Array(3).keys()].map((col) => {
                        const seatNumber = column + 1;
                        column = seatNumber;
                        return (
                          <div
                            key={col}
                            className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                              selectedSeat === seatNumber
                                ? "bg-green-600"
                                : seatOccupancy[seatNumber]
                                ? "bg-gray-200"
                                : ""
                            }`}
                            onClick={() => handleSeatSelection(seatNumber)}
                            disabled={assignedSeat || seatOccupancy[seatNumber]}
                            style={{
                              color: seatOccupancy[seatNumber]
                                ? "red"
                                : "black",
                            }}
                          >
                            <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                              {seatNumber}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  {[...Array(7).keys()].map((row) => (
                    <div key={row} className="flex gap-2">
                      {[...Array(3).keys()].map((col) => {
                        const seatNumber = column + 1;
                        column = seatNumber;
                        return (
                          <div
                            key={col}
                            className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                              selectedSeat === seatNumber
                                ? "bg-green-600"
                                : seatOccupancy[seatNumber]
                                ? "bg-gray-200"
                                : ""
                            }`}
                            onClick={() => handleSeatSelection(seatNumber)}
                            disabled={assignedSeat || seatOccupancy[seatNumber]}
                            style={{
                              color: seatOccupancy[seatNumber]
                                ? "red"
                                : "black",
                            }}
                          >
                            <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                              {seatNumber}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              {[...Array(1).keys()].map((row) => (
                <div key={row} className="flex gap-2">
                  {[...Array(13).keys()].map((col) => {
                    const seatNumber = column + 1;
                    column = seatNumber;
                    return (
                      <div
                        key={col}
                        className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                          selectedSeat === seatNumber
                            ? "bg-green-600"
                            : seatOccupancy[seatNumber]
                            ? "bg-gray-200"
                            : ""
                        }`}
                        onClick={() => handleSeatSelection(seatNumber)}
                        disabled={assignedSeat || seatOccupancy[seatNumber]}
                        style={{
                          color: seatOccupancy[seatNumber] ? "red" : "black",
                        }}
                      >
                        <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                          {seatNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
              {[...Array(2).keys()].map((row) => (
                <div key={row} className="flex gap-2">
                  {[...Array(14).keys()].map((col) => {
                    const seatNumber = column + 1;
                    column = seatNumber;
                    return (
                      <div
                        key={col}
                        className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                          selectedSeat === seatNumber
                            ? "bg-green-600"
                            : seatOccupancy[seatNumber]
                            ? "bg-gray-200"
                            : ""
                        }`}
                        onClick={() => handleSeatSelection(seatNumber)}
                        disabled={assignedSeat || seatOccupancy[seatNumber]}
                        style={{
                          color: seatOccupancy[seatNumber] ? "red" : "black",
                        }}
                      >
                        <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                          {seatNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
              {[...Array(1).keys()].map((row) => (
                <div key={row} className="flex gap-2">
                  {[...Array(15).keys()].map((col) => {
                    const seatNumber = column + 1;
                    column = seatNumber;
                    return (
                      <div
                        key={col}
                        className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                          selectedSeat === seatNumber
                            ? "bg-green-600"
                            : seatOccupancy[seatNumber]
                            ? "bg-gray-200"
                            : ""
                        }`}
                        onClick={() => handleSeatSelection(seatNumber)}
                        disabled={assignedSeat || seatOccupancy[seatNumber]}
                        style={{
                          color: seatOccupancy[seatNumber] ? "red" : "black",
                        }}
                      >
                        <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                          {seatNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="w-4"></div>
            <div className="flex flex-col gap-2 items-center mt-16">
              {[...Array(7).keys()].map((row) => (
                <div key={row} className="flex gap-2">
                  {[...Array(15).keys()].map((col) => {
                    const seatNumber = column + 1;
                    column = seatNumber;
                    return (
                      <div
                        key={col}
                        className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                          selectedSeat === seatNumber
                            ? "bg-green-600"
                            : seatOccupancy[seatNumber]
                            ? "bg-gray-200"
                            : ""
                        }`}
                        onClick={() => handleSeatSelection(seatNumber)}
                        disabled={assignedSeat || seatOccupancy[seatNumber]}
                        style={{
                          color: seatOccupancy[seatNumber] ? "red" : "black",
                        }}
                      >
                        <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                          {seatNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
              {[...Array(4).keys()].map((row) => (
                <div key={row} className="flex gap-2">
                  {[...Array(14).keys()].map((col) => {
                    const seatNumber = column + 1;
                    column = seatNumber;
                    return (
                      <div
                        key={col}
                        className={`seat bg-white-50 border border-gray-400 p-2 text-center cursor-pointer font-roboto text-10 ${
                          selectedSeat === seatNumber
                            ? "bg-green-600"
                            : seatOccupancy[seatNumber]
                            ? "bg-gray-200"
                            : ""
                        }`}
                        onClick={() => handleSeatSelection(seatNumber)}
                        disabled={assignedSeat || seatOccupancy[seatNumber]}
                        style={{
                          color: seatOccupancy[seatNumber] ? "red" : "black",
                        }}
                      >
                        <span className="flex justify-center items-center w-3 h-3 text-sm max-sm:size-0 max-sm:text-xs ">
                          {seatNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {selectedSeat && (
            <div className="flex justify-center items-center py-2 text-green-600">
              <p className="text-center">Confirm Selected Seat: {selectedSeat}</p>
              <button
                onClick={handleConfirmSeat}
                className="flex justify-center mx-2 py-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="green"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SeatMapPage;
