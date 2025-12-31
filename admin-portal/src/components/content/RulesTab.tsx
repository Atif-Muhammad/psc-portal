import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ClubRulesTab from "./ClubRulesTab"

export default function RulesTab() {
    return (
        <Tabs defaultValue="club" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="club">Club Rules</TabsTrigger>
                <TabsTrigger value="room">Room Rules</TabsTrigger>
                <TabsTrigger value="hall">Hall Rules</TabsTrigger>
                <TabsTrigger value="lawn">Lawn Rules</TabsTrigger>
                <TabsTrigger value="photoshoot">Photoshoot Rules</TabsTrigger>
            </TabsList>

            <div className="mt-6">
                <TabsContent value="club">
                    <ClubRulesTab type="CLUB" title="Club Rules" />
                </TabsContent>
                <TabsContent value="room">
                    <ClubRulesTab type="ROOM" title="Room Rules" />
                </TabsContent>
                <TabsContent value="hall">
                    <ClubRulesTab type="HALL" title="Hall Rules" />
                </TabsContent>
                <TabsContent value="lawn">
                    <ClubRulesTab type="LAWN" title="Lawn Rules" />
                </TabsContent>
                <TabsContent value="photoshoot">
                    <ClubRulesTab type="PHOTOSHOOT" title="Photoshoot Rules" />
                </TabsContent>
            </div>
        </Tabs>
    )
}
