const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, {
      "Content-Type": "application/json"
    });

    res.end(
      JSON.stringify({
        status: "online",
        service: "V75 Market Bridge"
      })
    );

    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

const deriv = new WebSocket(
  "wss://ws.binaryws.com/websockets/v3"
);

deriv.on("open", () => {
  console.log("Connected to Deriv WebSocket");

  deriv.send(
    JSON.stringify({
      active_symbols: "brief",
      product_type: "basic",
      req_id: 1
    })
  );
});

deriv.on("message", (data) => {
  try {
    const msg = JSON.parse(data.toString());

    if (msg.msg_type === "active_symbols") {
      const v75 = msg.active_symbols.find((item) => {
        const name = (
          item.underlying_symbol_name ||
          item.display_name ||
          ""
        ).toLowerCase();

        return name.includes("volatility 75");
      });

      if (!v75) {
        console.log("V75 symbol not found");
        return;
      }

      const symbol =
        v75.underlying_symbol ||
        v75.symbol;

      console.log("V75 Symbol:", symbol);

      deriv.send(
        JSON.stringify({
          ticks: symbol,
          subscribe: 1,
          req_id: 2
        })
      );
    }

    if (msg.msg_type === "tick") {
      const tickData = {
        symbol: msg.tick.symbol,
        price: msg.tick.quote,
        epoch: msg.tick.epoch
      };

      console.log("V75 LIVE:", JSON.stringify(tickData));
    }

    if (msg.error) {
      console.error(
        "Deriv API Error:",
        msg.error.message
      );
    }
  } catch (error) {
    console.error(
      "Message processing error:",
      error.message
    );
  }
});

deriv.on("error", (error) => {
  console.error(
    "Deriv WebSocket Error:",
    error.message
  );
});

deriv.on("close", () => {
  console.log("Deriv WebSocket disconnected");
});

server.listen(PORT, HOST, () => {
  console.log(
    `V75 Market Bridge running on port ${PORT}`
  );
});
