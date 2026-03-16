import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/sendEmail"

export async function GET(){

  await sendEmail(
    "huseynxanliaslan@gmail.com",
    "Contract Test",
    "<h1>Email system working</h1>"
  )

  return NextResponse.json({success:true})

}