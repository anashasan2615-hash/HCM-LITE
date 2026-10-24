/**
 * HCM Lite - Payroll & Payslip Management
 * Calculates monthly payroll according to exact formula:
 *   perDay = monthlySalary / workingDaysInMonth
 *   deduction = perDay * (absentDays + 0.5 * halfDays)
 *   net = salary - deduction
 * Supports official voucher generation and number-to-words conversion.
 */

/**
 * Converts a positive number to English words for official vouchers.
 * @param {number} num 
 * @returns {string}
 */
function numberToWords(num) {
  const n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return 'Zero Pakistani Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertSection(val) {
    let str = '';
    if (val >= 100) {
      str += units[Math.floor(val / 100)] + ' Hundred ';
      val %= 100;
    }
    if (val >= 20) {
      str += tens[Math.floor(val / 10)] + ' ';
      val %= 10;
    }
    if (val > 0) {
      str += units[val] + ' ';
    }
    return str.trim();
  }

  let words = '';
  const crore = Math.floor(n / 10000000);
  let rem = n % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  const hundreds = rem;

  if (crore > 0) words += convertSection(crore) + ' Crore ';
  if (lakh > 0) words += convertSection(lakh) + ' Lakh ';
  if (thousand > 0) words += convertSection(thousand) + ' Thousand ';
  if (hundreds > 0) words += convertSection(hundreds) + ' ';

  return words.trim() + ' Pakistani Rupees Only';
}

/**
 * Generates full payslip details for an employee in a given month.
 * @param {string} userId 
 * @param {number} year 
 * @param {number} monthIndex - 0 to 11
 * @returns {Object|null}
 */
function generatePayslipData(userId, year, monthIndex) {
  const user = getUserById(userId);
  if (!user) return null;

  const company = getCompany() || {
    name: 'Our Organization',
    officeStart: '09:00',
    graceMinutes: 15,
    yearlyLeaveQuota: 20,
    workingDays: [1, 2, 3, 4, 5]
  };

  const attendance = getAttendance();
  const leaves = getLeaves();

  // Compute attendance stats
  const stats = computeMonthlyStats(user, year, monthIndex, attendance, leaves, company);

  // Calculate payroll
  const payroll = calculatePayroll(user.salary, stats.workingDaysInMonth, stats.absent, stats.halfDay);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const periodStr = `${monthNames[monthIndex]} ${year}`;

  return {
    employee: user,
    company: company,
    period: periodStr,
    year: year,
    monthIndex: monthIndex,
    stats: stats,
    payroll: payroll,
    amountInWords: numberToWords(payroll.netSalary)
  };
}
