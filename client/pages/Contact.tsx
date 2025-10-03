// import { useState, FormEvent } from "react";
// import { Label } from "@/components/ui/label";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { useToast } from "@/hooks/use-toast";

// export default function Contact() {
//   const { toast } = useToast();
//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");
//   const [message, setMessage] = useState("");
//   const [sending, setSending] = useState(false);

//   const onSubmit = async (e: FormEvent) => {
//     e.preventDefault();
//     setSending(true);
//     try {
//       const resp = await fetch("/api/contact-submissions", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ name, email, message }),
//       });
//       if (!resp.ok) throw new Error("Failed to submit");
//       toast({ title: "Message sent", description: "Thanks for contacting us." });
//       setName("");
//       setEmail("");
//       setMessage("");
//     } catch (e: any) {
//       toast({ title: "Unable to send", description: e?.message ?? "Try again later" });
//     } finally {
//       setSending(false);
//     }
//   };

//   return (
//     <div className="mx-auto w-full max-w-5xl space-y-6">
//       <h2 className="text-2xl font-bold">Contact Us</h2>
//       <div className="grid gap-6 md:grid-cols-2">
//         <Card>
//           <CardHeader>
//             <CardTitle className="text-base">Institute Info</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-2 text-sm">
//             <div>
//               <span className="font-medium">Address:</span> 123 Main Road, City
//               Campus
//             </div>
//             <div>
//               <span className="font-medium">Phone:</span> +92 300 1234567
//             </div>
//             <div>
//               <span className="font-medium">Email:</span> info@eduadmin.example
//             </div>
//             <div className="aspect-[16/9] overflow-hidden rounded-md border">
//               <iframe
//                 title="map"
//                 className="h-full w-full"
//                 src="https://www.openstreetmap.org/export/embed.html?bbox=66.99%2C24.84%2C67.13%2C24.92&amp;layer=mapnik"
//               ></iframe>
//             </div>
//           </CardContent>
//         </Card>
//         <Card>
//           <CardHeader>
//             <CardTitle className="text-base">Email Form</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <form className="space-y-4" onSubmit={onSubmit}>
//               <div className="space-y-1.5">
//                 <Label htmlFor="name">Name</Label>
//                 <Input
//                   id="name"
//                   value={name}
//                   onChange={(e) => setName(e.target.value)}
//                   required
//                 />
//               </div>
//               <div className="space-y-1.5">
//                 <Label htmlFor="email">Email</Label>
//                 <Input
//                   id="email"
//                   type="email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   required
//                 />
//               </div>
//               <div className="space-y-1.5">
//                 <Label htmlFor="message">Message</Label>
//                 <Textarea
//                   id="message"
//                   value={message}
//                   onChange={(e) => setMessage(e.target.value)}
//                   required
//                 />
//               </div>
//               <Button type="submit" disabled={sending} className="w-full">
//                 {sending ? "Sending…" : "Send"}
//               </Button>
//             </form>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }

import { useState, FormEvent } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function Contact() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const { error } = await supabase
        .from("contacts")
        .insert([{ name, email, message }]);

      if (error) throw error;

      toast({
        title: "Message sent",
        description: "Thanks for contacting us.",
      });
      setName("");
      setEmail("");
      setMessage("");
    } catch (e: any) {
      toast({
        title: "Unable to send",
        description: e?.message ?? "Try again later",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <h2 className="text-2xl font-bold">Contact Us</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Institute Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Address:</span> Skills Institute,
              Susan Road, Chenab Market, Faisalabad
            </div>
            <div>
              <span className="font-medium">Phone:</span> +92 300 1234567
            </div>
            <div>
              <span className="font-medium">Email:</span> info@eduadmin.example
            </div>
            <div className="aspect-[16/9] overflow-hidden rounded-md border">
              <iframe
                title="map"
                className="h-full w-full"
                loading="eager"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.openstreetmap.org/export/embed.html?bbox=73.1075%2C31.4102%2C73.1275%2C31.4302&layer=mapnik&marker=31.4202%2C73.1175"
              ></iframe>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Form</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={sending} className="w-full">
                {sending ? "Sending…" : "Send"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
