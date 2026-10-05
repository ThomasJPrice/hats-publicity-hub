import { runSeed } from "./run";

runSeed((msg) => console.log(msg))
  .then(() => console.log("Seed complete"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
