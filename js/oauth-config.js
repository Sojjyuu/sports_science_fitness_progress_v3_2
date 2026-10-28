/* ใส่ Google OAuth Web Client ID เมื่อนำระบบขึ้นโดเมนจริง เช่น 123.apps.googleusercontent.com
   ต้องใส่ค่าเดียวกันใน server/.env ที่ GOOGLE_CLIENT_ID เพื่อให้ Backend ตรวจ token ก่อนออก JWT
   ถ้าเว้นว่าง ระบบจะใช้โหมดสาธิต (backend สร้างบัญชี google.demo@sportscience.local ให้) */
window.SSF_GOOGLE_CLIENT_ID = '';
