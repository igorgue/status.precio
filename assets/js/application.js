// Precio.Monitor (tm)
window.Precio = {}
Precio.Monitor = {}

Precio.Monitor.GDAX_REST_CANDLES_URL = "https://api.gdax.com/products/BTC-USD/candles?granularity=60&start=__START_TIME__&end=__END_TIME__"
Precio.Monitor.GDAX_REST_TICKER_URL = "https://api.gdax.com/products/BTC-USD/ticker"
Precio.Monitor.PRECIO_REST_URL = "https://precio.bitstop.co/precio.json"

// Get the http response synchronously (needed to record time)
Precio.Monitor.getUrl = function (url, discardResponse) {
  if (typeof(discardResponse) == undefined) discardResponse = false

  let xmlHttp = new XMLHttpRequest()

  xmlHttp.open("GET", url, false) // false for synchronous request
  xmlHttp.send(null)

  if (!discardResponse) return xmlHttp.responseText
}

// Time the resquest in ms
Precio.Monitor.timeResponse = function (url) {
  let startTime = new Date().getTime()

  Precio.Monitor.getUrl(url, true) // discard response, we don't need it for this

  let endTime = new Date().getTime()

  return endTime - startTime
}

// "private" function to return a gdax url from the time of now to 60k ms before
Precio.Monitor._GetGdaxUrl = function () {
  var endTime = new Date()
  var startTime = new Date(endTime.getTime() - 60000)

  return Precio.Monitor.GDAX_REST_CANDLES_URL.replace(
    '__START_TIME__', 
    startTime.toISOString()
  ).replace(
    '__END_TIME__',
    endTime.toISOString()
  )
}

// We check the pong
Precio.Monitor.pingPongTracker = function () {
  var pongElement = document.getElementById("pong")
  var statusTableElement = document.getElementById("status-table")
  let dateTime = new Date()

  try {
    let res = Precio.Monitor.getUrl(Precio.Monitor.PRECIO_REST_URL, true) // ignore response

    statusTableElement.style = ""
    pongElement.style = "color: green"
    pongElement.title = "at: " + dateTime.toISOString()

    pongElement.innerHTML = "PONG"
  } catch {
    statusTableElement.style = "visibility: collapse"
    pongElement.style = "color: red"
    pongElement.title = "at: " + dateTime.toISOString()

    pongElement.innerHTML = ":("
  }

  // Reschedule run in 1 second...
  setTimeout(function () {
    Precio.Monitor.pingPongTracker()
  }, 1000)
}

Precio.Monitor.serverTimeTracker = function () {
  let gdaxServerTime = new Date(JSON.parse(Precio.Monitor.getUrl(Precio.Monitor.GDAX_REST_TICKER_URL)).time)
  let precioServerTime = new Date(JSON.parse(Precio.Monitor.getUrl(Precio.Monitor.PRECIO_REST_URL)).T * 1000)

  let gdaxServerTimeInMs = gdaxServerTime.getTime()
  let precioServerTimeInMs = precioServerTime.getTime()

  var precioTimeElement = document.getElementById("precio-time")
  var gdaxTimeElement = document.getElementById("gdax-time")

  precioTimeElement.innerHTML = precioServerTime.toISOString()
  gdaxTimeElement.innerHTML = gdaxServerTime.toISOString()

  if (gdaxServerTimeInMs == precioServerTimeInMs) {
    precioTimeElement.style = ""
    gdaxTimeElement.style = ""
  } else if (precioServerTimeInMs > gdaxServerTimeInMs) {
    precioTimeElement.style = "color: red"
    gdaxTimeElement.style = "color: green"

    precioTimeElement.innerHTML += " <sup>+" + (Math.abs(precioServerTimeInMs - gdaxServerTimeInMs) / 1000).toFixed(2) + "s</sup>"
  } else {
    precioTimeElement.style = "color: green"
    gdaxTimeElement.style = "color: red"

    precioTimeElement.innerHTML += " <sup>-" + (Math.abs(precioServerTimeInMs - gdaxServerTimeInMs) / 1000).toFixed(2) + "s</sup>"
  }

  // Reschedule run in 1 second...
  setTimeout(function () {
    Precio.Monitor.serverTimeTracker()
  }, 1000)
}

// Start tracking price run every second
Precio.Monitor.priceTracker = function () {
  let gdaxPrice = parseFloat(JSON.parse(
    Precio.Monitor.getUrl(Precio.Monitor.GDAX_REST_TICKER_URL)
  ).price)
  let precioPrice = parseFloat(JSON.parse(
    Precio.Monitor.getUrl(Precio.Monitor.PRECIO_REST_URL)
  ).C_RAW)

  var precioPriceElement = document.getElementById("precio-price")
  var gdaxPriceElement = document.getElementById("gdax-price")

  precioPriceElement.innerHTML = "$" + precioPrice.toFixed(2)
  gdaxPriceElement.innerHTML = "$" + gdaxPrice.toFixed(2)

  if (precioPrice == gdaxPrice) {
    precioPriceElement.style = ""
    gdaxPriceElement.style = ""
  } else if (precioPrice > gdaxPrice) {
    precioPriceElement.style = "color: red"
    gdaxPriceElement.style = "color: green"

    precioPriceElement.innerHTML += " <sup>+$" + Math.abs(precioPrice - gdaxPrice).toFixed(2) + "</sup>"
  } else {
    precioPriceElement.style = "color: green"
    gdaxPriceElement.style = "color: red"

    precioPriceElement.innerHTML += " <sup>-$" + Math.abs(precioPrice - gdaxPrice).toFixed(2) + "</sup>"
  }

  // Reschedule run in 1 second...
  setTimeout(function () {
    Precio.Monitor.priceTracker()
  }, 1000)
}

// Start tracking time of http responses
Precio.Monitor.latencyTracker = function () {
  // Get response times
  let gdaxTime = Precio.Monitor.timeResponse(Precio.Monitor._GetGdaxUrl())
  let precioTime = Precio.Monitor.timeResponse(Precio.Monitor.PRECIO_REST_URL)

  var precioLatency = document.getElementById("precio-latency")
  var gdaxLatency = document.getElementById("gdax-latency")

  precioLatency.innerHTML = precioTime + "ms"
  gdaxLatency.innerHTML = gdaxTime + "ms"

  if (gdaxTime == precioTime) {
    // Prices are equal, we just remove styles, will never happen
    precioLatency.style = ""
    gdaxLatency.style = ""
  } else if (precioTime < gdaxTime) {
    // Precio is faster than gdax
    precioLatency.style = "color: green"
    gdaxLatency.style = "color: red"

    precioLatency.innerHTML += " <sup>-" + Math.abs(precioTime - gdaxTime) + "ms</sup>"
  } else {
    // Precio is slower
    precioLatency.style = "color: red"
    gdaxLatency.style = "color: green"

    precioLatency.innerHTML += " <sup>+" + Math.abs(precioTime - gdaxTime) + " ms</sup>"
  }

  // Reschedule run in 3 seconds...
  setTimeout(function () {
    Precio.Monitor.latencyTracker()
  }, 3000)
}

window.onload = function (e) {
  Precio.Monitor.pingPongTracker()
  Precio.Monitor.latencyTracker()
  Precio.Monitor.priceTracker()
  Precio.Monitor.serverTimeTracker()
}
