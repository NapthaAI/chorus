## **arshy / richard \- 2025/11/26 11:40 GMT \- Transcript**

# **Attendees**

Mohamed Arshath, Richard Blythman

# **Transcript**

Richard Blythman: Hey, how's it going?

Mohamed Arshath: Hi legit. Hi. Give me a second.

Richard Blythman: Yeah. yeah. I just wanted to talk about an idea I had …

Mohamed Arshath: Yeah. Mhm.

Richard Blythman: which thinking of doing an experiment around. the dev tool stuff is still super slow. like wizard kit. we're still trying to close lance TB.

Mohamed Arshath: Yeah. Mhm.

Richard Blythman: My main concern is most of the startups that we talk to don't track onboarding. They don't track activation increasing likeation and retention and that sort of thing…

Mohamed Arshath: Mhm. Right. Mhm.

Richard Blythman: which suggests that it's not that important to them, so I'm pretty confident that agent guided onboarding will improve activation. we saw the blog post from Dev Cycle…

Mohamed Arshath: Yeah. Mhm.

Richard Blythman: where they increased the SDK installs 3x using an approach similar to ours and that approach is more basic than ours because they don't even have the workflows and they don't have analytics. so think we're lving I think there is a problem and I think we're solving it. I think what we're building can solve it really well. It's just that it doesn't seem like it's a priority to anyone and that's my concern about this direction and so I'm kind of weighing up should we pivot to a new idea or not. we'll keep trying to close Lance DB maybe they're still updating their docs.

Mohamed Arshath: Mhm. I can't

Richard Blythman: So maybe by the end of the year we might start a pilot program with them with Wizard Kit and maybe we'll go ahead with that. But while we're waiting there, the question is what can we continue to build? So maybe we can start exploring this new idea that I have. so the idea is I've been using clawed code for a lot of non-technical use cases for the past. so I have a bunch of different repos with different cloudmd files and different commands and I use them for different use cases kind of like the cyborg repo right which I've renamed product agent that's now my product agent. It has a specialized system prompt for doing product stuff.

Richard Blythman: It has a bunch of commands for doing specialized product stuff like create an opportunity assessment and all these sorts of commands. And it also has a custom memory structure. In our case, the memory structure is broken down into the different product opportunities and the different product experiments and different research associated with those and different business documents. And that's kind of like its custom memory structure for the product agent. then I have a bunch more. so I actually have a legal agent for analyzing the docs with Mark during the separation. it has its own system prompts. it has a bunch of different commands. It has its own memory structure which in this case is just the different legal documents and that sort of thing.

Richard Blythman: Then I had a agent for scanning Reddit and Twitter and doing research about user problems and that sort of thing. so I scan Reddit every day. I can scan different subreddits and try and figure out what problems people are facing in different subreddits and that sort of thing. I probably have about 10 different agents. I have this journal agent where I journal my thoughts and then I turn them into posts that I can put on LinkedIn for example. So a lot of my posts on LinkedIn come from my journal agents. and then there's I'm creating more and more every day. what else do I have here? There's an agent I have for planning the pilot program and how to close it.

Richard Blythman: There's an agent for doing data analysis. I'm even building agents for doing my grocery shopping in my personal time and planning meals and all that sort of stuff. So all of these are just apps built on top of claw code basically and it works really well across a lot of different tasks. Some of the stuff I've been exploring is sometimes I need context from the product agent for the pilot planning agent for example and because they're in separate repos I need to pass the context between different repos and so I have a command in the product agent which it's something like you need to comm

### 00:05:00

Richard Blythman: communicate information about this product to an agent for planning a pilot program, create a markdown file that I will manually copy and paste from the product repo to the pilot planning repo. So, it's kind of like communication between these agents is now starting to happen and I do that manually, right? So, these are starting to turn into multi- aent stuff. the problem the pain point for me at the moment is I have 10 different agents that I use quite regularly and I have a different cursor instance open for each one and I use claw code in the CLI.

Richard Blythman: So if I want to go to my product agent, I have to go to cursor, I have to find that window and go to that product agent. And then if I want to go to a research agent, I need to go to that repo. And then maybe claude code runs for a long time. So I need to go back to the window to see if it's finished. And what would be really nice would be if I just had a single interface where I could see all where I could interact with all of the agents and I could see if they were finished their current task basically.

Mohamed Arshath: Yep. Mhm.

Richard Blythman: So it's kind of like just a unified interface like a wrapper on top of cloud code that allows me to run different cloud code sessions across different repos. That's basically what I need. So I was thinking about what this looks like for the past month or six weeks and the first idea I had was basically just a TUI. where it would just be there's a bunch of twoies built on top of cloud code I think. and this one would allow us to do it across separate repos. there's one called ccen sessions which is kind of like an orchestrator across different clawed codes.

Richard Blythman: sessions, but it's all in the same repo. so that's a little bit different to what we do. It's like helping you to run different cloud code sessions in a single repo. there's another one called Quack, which is actually like a local desktop app. It's not open source, but they seem to allow you to do claw code sessions across different repos. so that's kind of the closest to…

Mohamed Arshath: Mhm. Yeah.

Richard Blythman: what we're doing. but that's super early that project. I went into their Discord, there's only 20 people or something. I can show you what that looks like actually.

Richard Blythman: Sorry, pressed the wrong button. And let me show you what that looks like. share screen. This is kind of what Quack looks like. So you can see you have the different agents on the left hand side and then there's a chat in the middle and then on the right there's another thing where you can interact with MCP servers. They also have a file viewer and that sort of thing where you can read markdown files.

Richard Blythman: So t take a look at that and see what I was trying to think what the UI for this would look Right. …

Mohamed Arshath: Yeah. Mhm.

Richard Blythman: and initially I was thinking it should look like an editor or a terminal or something like that. but an one other idea I had is maybe it should look like Slack basically because first of all it's for nontechnical people users and so Yeah.

Mohamed Arshath: Can I jump in here?

Mohamed Arshath: I have two ideas that maybe I mean it might be very different to where you are going but as you speak two things that I recently been exploring myself not exploring but read that really caught my mind and then you're exploring this right one is this idea called the future is solo.

Richard Blythman: Yeah.

Mohamed Arshath: Have you heard of it? basically with your co-founder could be just this less bunch of agents so the future is solo right? that's one idea that comes to my mind for people like you or people ourselves.

Mohamed Arshath: of what if we run a non AI company using this now you're doing all these product exploration and all that but what if we use this bunch of cloud code agents we set up our own experiment but in this case we set up a commerce or something like that and then all this advertisement and stuff run through that and that can become like our product one we could scale it to

### 00:10:00

Mohamed Arshath: different stuff but at the same time we prove we don't have to depend on anyone else we validate the idea by ourselves because it starts making money like it starts doing this so that one idea came to me because I've been reading about this so it really is like this ethos of the future is solo sort of is also what you're describing instead of you having founders now we have the agents

Mohamed Arshath: to create this interface whatever that's best suited for this as we explore we can add to it and we don't have to have anyone's we can test it ourselves we don't have to depend on others so that's one thought and the twe and all that like it I think maybe I spoke about it before the SSD guys did this thing called ter terminal coffee shop right they actually started that send It's very interesting. Maybe we can do something like that. basically, you shop for coffee through terminal. You pay everything through terminal. so it's a very interesting concept that they say it's possible. and they still running the shop, but of course it's only in US and UK. but that's very cute idea, I think it is moving towards that and I'm really interested. Yeah, these are the two thoughts that came to me.

Mohamed Arshath: Just wanted to sh Yeah.

Richard Blythman: Very cool.

Richard Blythman: Yeah, I think building a fully autonomous company kind of commerce is really interesting. I think initially we're going to need a lot of human in the loop at least for the foreseeable future. And also rather than we want to run the company using AI agents,…

Mohamed Arshath: Mhm.

Richard Blythman: but why not do it for what Napa already does instead of something separate like commerce? That's kind of what I'm thinking.

Mohamed Arshath: Yeah. Yeah.

Richard Blythman: And the reason I like that we can like dog food it can use it ourselves every day to coordinate within Napa.

Mohamed Arshath: Mhm. Mhm.

Richard Blythman: 

Richard Blythman: And we've never done that with a product before. We've never been really heavy users of our own products.

Mohamed Arshath: Mhm. that makes sense. Yeah.

Richard Blythman: And I think it would give us an advantage if we could use our own products every day. All and…

Richard Blythman: Honestly I'm in the loop with AI all day basically. I'm in one of the cursor repos at the terminal thinking almost my entire day is just in the loop with AI and I think that's going to become more of a pattern in future. And like I said, I have these problems with being in the loop. which a single interface would solve.

Mohamed Arshath: Mhm.

Richard Blythman: But yeah, I really think that this would be the idea that this would be our product and we could sell this to all sorts of companies. So maybe we could sell it to an commerce company and work very closely with them and…

Mohamed Arshath: Yeah. Yeah. Yeah.

Richard Blythman: study the patterns and what they need and then we would get better at understanding how these different companies organize and coordinate. but yeah I was thinking about what the user interface looks like for this and Slack was like an interesting one.

Richard Blythman: If you look at this it looks like on the left hand side we have the different agents in the same way in Slack we have the different teammates right and…

Mohamed Arshath: Mhm.

Richard Blythman: then you click on one of these agents and it opens a chat window and then you can chat with that agent or…

Mohamed Arshath: Mhm.

Richard Blythman: 

Richard Blythman: that colleague. And then Slack also has something on the right hand side for usually comments,…

Mohamed Arshath: Mhm.

Richard Blythman: but you could imagine you could also have something else like I don't know documents or something like that.

Richard Blythman: 

Mohamed Arshath: Mhm.

Richard Blythman: Also, if you go to Slack, let me you see up here there's like I actually was just exploring these.

Mohamed Arshath: Mhm. Mhm.

Richard Blythman: There's different files in a tab. you can also create a folder and stuff. there's canvas where you can create an agenda or something like that. You can create files or you can create employee onboarding or there's actually a bunch of features on Slack that we don't use. But this is a good inspiration for how our UI could look, We could have a product brief for each agent that we're chatting with. We could have these different tabs. One of them could be messages, one of them could be files, one of them could be, some sort of markdown file like a PRD or something like that, right?

### 00:15:00

Richard Blythman: And because I think viewing documents is one of the important parts of what I'm doing a lot of the time, let's say this is the product agent, I want to be talking to the product agent about different product ideas, but then it's going to create some sort of doc and I want to be able to view that doc in the UI. So maybe it creates the docs here or something and I can look at the different docs in the app, So, it shows me. Let's see if I can find a markdown. no. This just opens Google Docs. But yeah, with my product agent, I definitely need to be able to look at docs as well. And maybe we could have different tabs for that product agent, for example. yeah, this is basically the idea.

Richard Blythman: And I think it's my main concern with this is competition. I think someone maybe what's it called? Google anti-gravity could do something like this Claude could launch something like this in future. the big players are going to try and build these multi- aent orchestrators. so I think we need to be fast. but I also don't think they're going to launch something like that in the next say two or three months and I'm hoping we can prototype something in two to three weeks or something and post it on HackerNews and get some sort of see if people are interested in it. Right.

Richard Blythman: and maybe we can move fast enough that we get there before the big players. it's basically like a cursor beat VS Code by shipping something and getting a lot of users very quickly. and we would be trying to do something similar. We'd be launching cursor for agents. and it would look like this Slack interface. so if we move fast I think we can maybe get some interest and attention first. The second thing is there's a lot of different ways to organize these agents. one way to do it is CC sessions approach which is all of the agents in a single repo. And I think that's the approach that Claude are going to use mostly. It's going to be like monolithic.

Richard Blythman: It's going to be basically a single agent with a lot of sub agents. That's how Claude would build it, I think, and probably how Google would build it as well. We much prefer the decentralized approach. And so that's why I think it's useful to have the separate repos for each agent. The reason that I built them in separate repos is because it helps from a permissions point of view. So, for example, one of the agents we're working with the Debell consultants at the moment called Marcos. You probably saw him in Slack. I wanted to share one of the agents with him, but I didn't want to share everything, I didn't want to share the entire Napa organization. And so, I was able to do that because it's in a separate repo. I just added him to that repo on GitHub.

Richard Blythman: If we had all of the agents, all the sub aents in the same repo, then there would be a permissions issue because I can't give people access to only part of the repo or at least I don't know how to do that. Also in the legal agent, I have the separation agreement with Mark. I didn't want to have that in the same repo as the product agent, for example. So that's the reason that it helps to have separate repos. and how I'm imagining this is for the Slack product. I'm actually hacking on something at the moment just to test it out. but how I'm doing it at the moment is I just spawn different clawed sessions in different repos and there's no MCP involved, right? But I imagine in future we would deploy these clawed code agents as

Richard Blythman: MCP servers and then the communication would happen via MCP. so it's really multi- aent and because it's via MCP those agents could run on different nodes on different servers, so there's a bunch of questions there that I have about how can we deploy cloud code agents as MCP servers and how can we host them as MCP servers. the reason I'm saying this is I don't think Google if they did add multi- aent to anti-gravity tomorrow. I don't think they would have each agent as an MCP server. I think they would just have it as a single repo with sub aents because They see the organization as monolithic whereas we see it as more decentralized and that's something that makes us different I guess.

### 00:20:00

Richard Blythman: So even if they build the same something similar, I think our approach is still different in that it's going to be decentralized.

Richard Blythman: It's going to be different agents running on different nodes using MCP in the same way that we did with the Napa node, It's basically the Napa node except now built on top of Claude's code. That's kind of how I think about

Mohamed Arshath: Mhm. Yeah.

Mohamed Arshath: So okay let's say we are I will take a look like if it is a slack app then we are building for MVP should we build it on NexJS sort of environment or…

Richard Blythman: I'm thinking of local app using electron at the moment. Yeah.

Mohamed Arshath: yeah that's what I'm thinking the second option would be electron because all local apps even VS code is just based on electron So the other one would be electron. So we could think along electron. So for me what you want to do is when you open with a repository but the front end would look more like a slack.

Mohamed Arshath: the UI would look more like a slack all the agents in that would appear like your friends and when you click on one of them you can probably see their commands and where you can edit and then probably all the files they have created perhaps and then you can chat with them. here because clot code will take some time before replying. So probably the chat is not very instantaneous like it will you say something then clot will go and say hey I'm going to get back to you and then just imagining how it all goes and…

Richard Blythman: Or you could have a message in the same way that I get an unread message from a teammate.

Mohamed Arshath: then the report comes and

Richard Blythman: example, maybe we could see when the clawed code agent finishes running.

Mohamed Arshath: Mhm.

Richard Blythman: Maybe it looks like that agent has a message for you and you click on

Mohamed Arshath: So something like So that would be like an MAP and it is all stored in repository. So probably we can get to this by sometime early next week. Let's say I'm just imagining maybe at that point like we can sort of take a look and…

Mohamed Arshath: what are the things that we can add

Richard Blythman: Yeah, perfect.

Richard Blythman: Yeah. one more thing I wanted to show you is, I've been using this new Git client. It's called Git so this is by the co-founder of GitHub. I don't know if I mentioned to you, but I went on a retreat a weekend away with my startup community in Ireland, and the co-founder of GitHub was there. so I was with him for two or three days. and this is what he's building now. It's called Git this is obviously the git client that most people use is the git CLI, right?

Richard Blythman: This is a whole local app that acts as a git client. and the nice thing about it is it uses these things called virtual branches or something. I'm not sure how it works, right? But, I go to the product agent repo in cursor and I initialize it with git butler, And I used git butler instead of git. So I use the bot CLI command instead of the git CLI command in that repo. But the nice thing is I can see all of the branches at the same time. So when I was working with cloud code in the product agent repo, I would have to manually switch between different branches. So let's say I want to create a new document. I would create a new branch. I would create that document. Then I wanted to work on something else in parallel, I didn't want to merge yet. So,

Richard Blythman: I would have to change to a new branch and create a different type of documents or create a difference like product opportunity and a lot of the time I would have six different branches at the same time that I'm working on in parallel and it was just really difficult to switch back and forth between all of the different branches right with git butler I don't need to do any of that right so when I create a new claude code session it automatically creates a new branch so let's say I'm in cursor. where's the here. So I have all of these different claw codes terminals open. It would create a different branch for each one of these and then every time Claude finishes running, it turns that into a new commit. Right?

### 00:25:00

Richard Blythman: So if I said create a dock, it would create the dock and then stop. That would be one commit. And then if I continue that conversation, it would add another commit on that same branch. But if I start a new cloud code session in here, it creates a new branch for that. Or if I run clear and keep continue chatting, it creates a new branch. So when I'm in the same conversation, it adds all of those messages as different commits in the same branch. But if I start a new CL code session, it starts if I clear the session, it starts a new branch. And so I just don't need to worry about changing branches or even committing stuff. It just stores everything. And the way that it automatically commits is using So you add a hook to call code so that after every

Richard Blythman: interaction it automatically commits and you do that using git butler basically but what that means is that I can work on a lot of different branches in parallel. So this could be one cl code session this could be another cl code session this could be another code session and I can be chatting with all three of them and every time I send a message it would add a new commit if it adds a new file. and then for each branch I can actually push from here. So I can create PR and then merge PR. So everything can happen through the git butler app. And then I can also still manually add files as well.

Richard Blythman: This looks a bit like the VS code git extension. You can like drag files. You can rearrange commits. So I could move I can move it to a different branch if I want as well. I can move stuff around which is really really cool.

Mohamed Arshath: I can't bring this.

Richard Blythman: Yes.

Mohamed Arshath: How do you

Richard Blythman: It changed my entire flow. As soon as I saw this, I was because imagine I was just in I would have another CLI here where I'd be doing okay get branch or get checkout. I'd be changing all of my branches here. Now I just don't need to worry about creating any branches or switching between branches or making different commits and that sort of thing. so it's really really cool. So I recommend you try this out even with the coding agents just to see how it works. it takes I don't know half a day to figure out how it works for me. but I was thinking that whatever we build in terms of the Slack UI, wouldn't it be cool if there was another view?

Richard Blythman: So let's say we're talking to the product agent, Let me try and explain this. Let's say we're talking to the product agents. Wouldn't it be cool if there was …

Mohamed Arshath: Hey guys. Hello.

Richard Blythman: there is a tab here for So imagine if you could switch to git on the product agents and you see something like this with all of the different branches that are open on the product agents. so I think in my workflow I'm always switching between cursor and git butler because I need to manage when stuff is pushed and when I merge it into the main branch and all that sort of stuff, So whatever UI that we build, ideally I wouldn't have to switch between our Slack app and git butler.

Richard Blythman: I think all of that should be just in one. So I should be able to manage all of the commits as well as all of the stuff I do in cursor. So all of the clawed code stuff and doc stuff I do in cursor. I also have to manage the different branches in git butler. So maybe we would have a view where you can see what's been pushed. I guess the kind history of things that have been added a timeline of something like that. But maybe we can also do this automatically. I guess there might be some way that we can automate this because I guess whenever I finish a conversation with claw codes I almost always push it right.

Richard Blythman: So whenever I run clear maybe it should automatically push and…

Mohamed Arshath: Yeah,…

Richard Blythman: merge the previous branch or something but sometimes I do have conversations with cloud that I don't want to push as well. that's the other side. I think that's like a problem that we need to figure out in future guess. I just thought it would be good for you to try out Git And I think you'll probably find it useful when you're working on a lot of different branches

### 00:30:00

Mohamed Arshath: I'll take a look. So yeah, let me plan this out. probably I'll try to come up with MVP. Maybe the MEP is slightly not aligned with you. But then at least that gives us a base to say hey this is not there this features so let me try to get there and then I think I understand the vision. No.

Richard Blythman: Great. Yeah. Dive in and look at the competitors look at Quack, look at CC,…

Mohamed Arshath: Yeah. Yeah.

Richard Blythman: try to analyze what they do differently. just get up to speed with the problem space, what exists. and…

Mohamed Arshath: Yeah. …

Richard Blythman: yeah, then maybe you can document that.

Mohamed Arshath: I will document that if you have to describe because this is recorded, So if you have to describe what we are building in a paragraph maybe we can do that so that that can be the part that we are aligned on. How would you describe? right.

Richard Blythman: It's a wrapper on top of claw codes that looks like a Slack UI.

Mohamed Arshath: Yeah. So, it's largely at least primarily will be used for coordinating different agents, right?

Richard Blythman: Yes, exactly. Yeah, it solves the problem that I have where every claw code session I have is in a different repo and I want to do that for a single interface and once we have this I will use it every day like that's and like I said before it's the first product where I'll use it all day every day myself and so we can iterate really fast on improving it once we have an MVP I'll just use that … then I'll be requesting features and maybe working on it myself. And we'll just try and use it internally ourselves until the product is good enough to launch.

Richard Blythman: 

Mohamed Arshath: Yeah, sure.

Mohamed Arshath: So I mean we should be from the same interface we should be able to try to open move to different repos and then see all this stuff right what's there and the different agents or…

Richard Blythman: Yeah, exactly.

Mohamed Arshath: we can add multiple repos and then see all the different agents together. Okay maybe for us we can keep it simple right?

Richard Blythman: Yeah. I think the way you add a new friend on Slack.

Mohamed Arshath: Yeah. Mhm.

Richard Blythman: Maybe you see your list of friends and then at the bottom of the list it says there's a plus button and it says add a new friend and then a popup comes up and then you put in the local repo or maybe the GitHub repo, I'm not sure. You put in the repo path and then it adds that to your list of friends on the Slack UI.

Mohamed Arshath: Mhm. Yeah,…

Richard Blythman: That's how I was thinking about that.

Mohamed Arshath: I understand.

Mohamed Arshath: Yeah, I understand.

Richard Blythman: Cool. …

Richard Blythman: yeah, I think this will be really cool. again,…

Mohamed Arshath: Yeah. Yeah.

Richard Blythman: it's just an let's I think even if we don't launch this, this is something that's reallyful for me internally, right? Yeah.

Mohamed Arshath: Yeah. Yeah.

Richard Blythman: So, we can just use it ourselves even if we don't launch it. and maybe it will be cool enough to launch as well.

Mohamed Arshath: Yeah. Yeah.

Mohamed Arshath: Yeah. All right.

Richard Blythman: 

Richard Blythman: Okay, Yeah, start digging into that. Maybe I'm actually flying out to the US on Friday again. but maybe we can check in async at the end of the week or maybe even in person. Let me know when. share the docs like your understanding with me. we can try and iterate on that async or maybe we can even jump on a call to align again and then we can think about what the MDP looks like and we can work on that and hopefully we can have some sort of working thing within a few days and then maybe within two or…

Richard Blythman: three weeks maybe we have something where we can use multiple agents something like that. So, yeah, we can kind of map out what the timeline looks like.

Mohamed Arshath: Yeah, sure.

Mohamed Arshath: Yeah, let's work on that. I'll try to share probably tomorrow I'll be coming up with the plans and the competitive studies and what it would look like and then from there I'm planning to use because I've recently been really amazed that Gemini 3 when it comes to front end maybe use anti- gravity for electron all the front end it's really really good it's really good yeah…

### 00:35:00

Richard Blythman: Yeah.

Mohamed Arshath: but yes sorry Geminina crew yeah Gemini

Mohamed Arshath: April. It's pretty good.

Richard Blythman: Okay, Yeah, in future that would be cool…

Mohamed Arshath: Yeah,…

Richard Blythman: if you could use either claw code or codeex or Gemini as the coding agents.

Mohamed Arshath: yeah, yeah,…

Richard Blythman: That's open code. That's something I'd love to do in future.

Mohamed Arshath: yeah, yeah, yeah, yeah. Makes sense. Yeah. This sounds like a really cool stuff to work on.

Richard Blythman: Cool. I think it's going to be really cool and…

Mohamed Arshath: Yeah. Yeah.

Richard Blythman: there's nothing like this. I think it's going to get competitive, but if we can make progress on this and we have a lot of different insights. I haven't seen anyone else using Git Butler, so that could be …

Richard Blythman: how we manage the different branches could be something that we know better. I've using non-technical cla code agents every day for three months now, So we have a lot of experience there. we do a lot of specificationdriven development actually like building the agents I've been using specifications to actually build these agents as well. I'll share that with you at some point as well.

Mohamed Arshath: Right. Nice.

Richard Blythman: Also all of our experience on the nodes it's kind of like the nata node in that we have agents talking across different MCP servers.

Mohamed Arshath: Yeah, for sure.

Richard Blythman: There's a lot of learning that we did with that before. So, I think there's enough reasons we might have some advantage here and it'll be a cool experiment either way.

Mohamed Arshath: Yeah. Yeah. Yeah. Agreed.

Richard Blythman: All right.

Mohamed Arshath: All right. Thanks,

Richard Blythman: Thanks, All right. I'll check

### Meeting ended after 00:36:49 👋

*This editable transcript was computer generated and might contain errors. People can also change the text after it was created.*

