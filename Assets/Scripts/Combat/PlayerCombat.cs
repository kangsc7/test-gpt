using UnityEngine;

public class PlayerCombat : MonoBehaviour
{
    public float HP = 100f;
    public GameObject[] equippedItems;

    public void TakeDamage(float damage)
    {
        HP -= damage;
        if (HP <= 0) Die();
    }

    void Die()
    {
        foreach (var item in equippedItems)
        {
            if (Random.value < 0.8f)
                Instantiate(item, transform.position + Vector3.up, Quaternion.identity);
        }
        Destroy(gameObject);
    }
}
