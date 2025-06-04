using UnityEngine;

public class MonsterSpawner : MonoBehaviour
{
    public GameObject monsterPrefab;
    public int baseCount = 5;

    void Start()
    {
        int playerCount = FindObjectsOfType<PlayerCombat>().Length;
        for (int i = 0; i < baseCount + playerCount * 2; i++)
        {
            Vector3 pos = transform.position + new Vector3(Random.Range(-10, 10), 0, Random.Range(-10, 10));
            Instantiate(monsterPrefab, pos, Quaternion.identity);
        }
    }
}
