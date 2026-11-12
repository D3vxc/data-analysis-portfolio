# Explainer transcript

Narration from the two minute explainer on [devmistri.co.uk](https://devmistri.co.uk/#dissertation).
The same text ships as a WebVTT caption track with the video, so captions can be switched off in the player.

Runtime 2:14. Voice is Kokoro `bf_alice`, synthesised offline; every frame is drawn in code from
the figures in [`analysis.ipynb`](analysis.ipynb).

## The question
*0:00*

Can a security system catch an attack that nobody has ever labelled? Not a variant of something it's seen. Not a near miss. Something genuinely new. That one question is my entire dissertation. And I'll be honest with you: I did not like the answer.

## Why it matters
*0:14*

Here's why it matters. Every second, thousands of connections hit a network. Almost all of them are ordinary. A few of them are an attack. The way we normally find them is to show a model millions of labelled attacks, and let it learn the difference. And it works. Ninety eight percent of attacks, caught. But every single one of those was labelled by a human first. Someone had already seen that attack, and written it down. So what happens on the day something arrives that nobody has written down yet?

## The idea
*0:43*

That's the gap my dissertation goes after. And here's the idea. What if you pair that trained model with a second one that has only ever seen normal traffic? It has no idea what an attack looks like. It only knows what normal looks like. It's called an autoencoder. Train it on nothing but ordinary connections, then ask it to rebuild each one from memory. Normal traffic? It rebuilds it almost perfectly. Something strange? It fumbles. And that fumble is your alarm. No labels needed.

## The test
*1:11*

So does it actually work? I tested it as harshly as I could. I deleted entire families of attack from the training data. Worms. Backdoors. Fuzzers. The model had never seen a single one. Then I threw them at it.

## The result
*1:23*

And the answer was no. The hybrid scored zero point nine eight three six. The plain model, on its own, scored zero point nine eight three seven. Identical. Eight experiments. Not one of them moved the needle. Which is not what I wanted to find, three months in.

## Where it does win
*1:38*

But then I found where it does win. Starve it of labels. Give the trained model fifty examples instead of a hundred and seventy five thousand. Suddenly the hybrid is two full points of AUC ahead. And with no labels at all, the anomaly detector on its own still reaches ninety percent. By two hundred and fifty examples, that advantage has completely vanished.

## The finding
*1:58*

So the real answer isn't that hybrids are better. It's sharper than that. Hybrids matter on day one. In the weeks before anyone has labelled anything. After that, just use your labels. That's not the answer I went looking for. But it's the one the data gave me, and it's the one I can defend.
