const MONTHS = [
  "JAN","FEB","MAR","APR",
  "MAJ","JUN","JUL","AUG",
  "SEP","OKT","NOV","DEC"
];


function randomLetters() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  return (
    chars[Math.floor(Math.random() * chars.length)] +
    chars[Math.floor(Math.random() * chars.length)]
  );
}


async function generateInvoiceNumber(supabase) {

  const year = new Date().getFullYear();


  const { data: counter, error } = await supabase
    .rpc("increment_order_counter", {
      input_year: year
    });


  if (error) throw error;


  const now = new Date();

  const day = String(now.getDate()).padStart(2, "0");
  const month = MONTHS[now.getMonth()];
  const shortYear = String(year).slice(-2);

  const hex = counter
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");


  return `${day}${month}${shortYear}${randomLetters()}${hex}`;
}


module.exports = { generateInvoiceNumber };